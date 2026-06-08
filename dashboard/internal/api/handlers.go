package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/santifer/career-ops/dashboard/internal/data"
	"github.com/santifer/career-ops/dashboard/internal/model"
)

var reLegitimacy = regexp.MustCompile(`(?i)\*\*Legitimacy:\*\*\s*(.+)`)

// RegisterRoutes wires all API routes onto mux, wrapped with CORS + logging.
func RegisterRoutes(mux *http.ServeMux, careerOpsPath string) {
	apiMux := http.NewServeMux()

	apiMux.HandleFunc("GET /api/meta", func(w http.ResponseWriter, r *http.Request) {
		handleMeta(w, r, careerOpsPath)
	})
	apiMux.HandleFunc("GET /api/offers", func(w http.ResponseWriter, r *http.Request) {
		handleOffers(w, r, careerOpsPath)
	})
	apiMux.HandleFunc("GET /api/offers/{n}", func(w http.ResponseWriter, r *http.Request) {
		handleOffer(w, r, careerOpsPath)
	})
	apiMux.HandleFunc("POST /api/offers/{n}/state", func(w http.ResponseWriter, r *http.Request) {
		handleOfferState(w, r, careerOpsPath)
	})
	apiMux.HandleFunc("POST /api/offers/{n}/pdf", func(w http.ResponseWriter, r *http.Request) {
		handleOfferPDF(w, r, careerOpsPath)
	})
	apiMux.HandleFunc("POST /api/offers/{n}/loc", func(w http.ResponseWriter, r *http.Request) {
		handleOfferLoc(w, r, careerOpsPath)
	})
	apiMux.HandleFunc("POST /api/offers/{n}/evaluate", func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "not implemented", http.StatusNotImplemented)
	})
	apiMux.HandleFunc("GET /api/files", func(w http.ResponseWriter, r *http.Request) {
		handleFiles(w, r, careerOpsPath)
	})
	apiMux.HandleFunc("GET /api/files/{path...}", func(w http.ResponseWriter, r *http.Request) {
		handleFileGet(w, r, careerOpsPath)
	})
	apiMux.HandleFunc("PUT /api/files/{path...}", func(w http.ResponseWriter, r *http.Request) {
		handleFilePut(w, r, careerOpsPath)
	})
	apiMux.HandleFunc("/api/ws/chat", func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "not implemented", http.StatusNotImplemented)
	})

	wrapped := chain(apiMux, logMiddleware, corsMiddleware)
	mux.Handle("/api/", wrapped)
}

// ─── helpers ────────────────────────────────────────────────────────────────

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func loadAllOffers(careerOpsPath string) []OfferDTO {
	apps := data.ParseApplications(careerOpsPath)
	dtos := make([]OfferDTO, 0, len(apps))
	for _, app := range apps {
		dtos = append(dtos, appToDTO(app, careerOpsPath, false))
	}
	return dtos
}

func appToDTO(app model.CareerApplication, careerOpsPath string, includeReport bool) OfferDTO {
	archetype := app.Archetype
	loc := app.Remote
	comp := app.CompEstimate

	// If report enrichment not pre-loaded, load it now
	if archetype == "" && app.ReportPath != "" {
		var tldr string
		archetype, tldr, loc, comp = data.LoadReportSummary(careerOpsPath, app.ReportPath)
		_ = tldr
	}

	legitimacy := extractLegitimacy(careerOpsPath, app.ReportPath)

	dto := OfferDTO{
		N:            app.Number,
		Score:        app.Score,
		Date:         app.Date,
		Company:      app.Company,
		Title:        app.Role,
		State:        data.NormalizeStatus(app.Status),
		Archetype:    archetype,
		Legitimacy:   legitimacy,
		Loc:          loc,
		Comp:         comp,
		URL:          app.JobURL,
		Notes:        app.Notes,
		Report:       app.ReportPath,
		RelatedFiles: data.FindRelatedFiles(careerOpsPath, app.Company),
	}

	if includeReport && app.ReportPath != "" {
		fullPath := filepath.Join(careerOpsPath, app.ReportPath)
		if content, err := os.ReadFile(fullPath); err == nil {
			dto.ReportMD = string(content)
		}
	}

	return dto
}

func extractLegitimacy(careerOpsPath, reportPath string) string {
	if reportPath == "" {
		return "Medium"
	}
	fullPath := filepath.Join(careerOpsPath, reportPath)
	content, err := os.ReadFile(fullPath)
	if err != nil {
		return "Medium"
	}
	header := string(content)
	if len(header) > 2000 {
		header = header[:2000]
	}
	if m := reLegitimacy.FindStringSubmatch(header); m != nil {
		v := strings.TrimSpace(m[1])
		switch {
		case strings.Contains(strings.ToLower(v), "high"):
			return "High Confidence"
		case strings.Contains(strings.ToLower(v), "low"):
			return "Low"
		default:
			return "Medium"
		}
	}
	return "Medium"
}

func buildStateCounts(apps []model.CareerApplication) []StateCountDTO {
	metrics := data.ComputeMetrics(apps)
	bc := metrics.ByStatus

	total := 0
	for _, c := range bc {
		total += c
	}

	order := []struct {
		id    string
		label string
		color string
	}{
		{"all", "All", "fg"},
		{"evaluated", "Evaluated", "blue"},
		{"applied", "Applied", "sky"},
		{"interview", "Interview", "green"},
		{"top", "Top ≥4", "gold"},
		{"skip", "Skip", "red"},
		{"rejected", "Rejected", "muted"},
		{"discarded", "Discarded", "muted"},
	}

	// count top≥4 manually
	top4 := 0
	for _, app := range apps {
		if app.Score >= 4.0 {
			top4++
		}
	}

	states := make([]StateCountDTO, 0, len(order))
	for _, o := range order {
		count := bc[o.id]
		if o.id == "all" {
			count = total
		} else if o.id == "top" {
			count = top4
		}
		states = append(states, StateCountDTO{ID: o.id, Label: o.label, Count: count, Color: o.color})
	}
	return states
}

func readVersion(careerOpsPath string) string {
	b, err := os.ReadFile(filepath.Join(careerOpsPath, "VERSION"))
	if err != nil {
		return "1.7.0"
	}
	return strings.TrimSpace(string(b))
}

// ─── handlers ───────────────────────────────────────────────────────────────

func handleMeta(w http.ResponseWriter, _ *http.Request, careerOpsPath string) {
	apps := data.ParseApplications(careerOpsPath)
	metrics := data.ComputeMetrics(apps)
	writeJSON(w, MetaDTO{
		User:        "mark",
		Project:     "career-ops",
		Version:     readVersion(careerOpsPath),
		AvgScore:    metrics.AvgScore,
		TotalOffers: metrics.Total,
		Generated:   time.Now().Format("2006-01-02"),
		Candidate:   "Mark Thistle",
		Location:    "Ottawa, ON",
	})
}

func handleOffers(w http.ResponseWriter, _ *http.Request, careerOpsPath string) {
	apps := data.ParseApplications(careerOpsPath)
	dtos := make([]OfferDTO, 0, len(apps))
	for _, app := range apps {
		dtos = append(dtos, appToDTO(app, careerOpsPath, false))
	}
	metrics := data.ComputeMetrics(apps)

	top4 := 0
	for _, app := range apps {
		if app.Score >= 4.0 {
			top4++
		}
	}

	writeJSON(w, OffersResponseDTO{
		Meta: MetaDTO{
			User:        "mark",
			Project:     "career-ops",
			Version:     readVersion(careerOpsPath),
			AvgScore:    metrics.AvgScore,
			TotalOffers: metrics.Total,
			Generated:   time.Now().Format("2006-01-02"),
			Candidate:   "Mark Thistle",
			Location:    "Ottawa, ON",
		},
		States: buildStateCounts(apps),
		Offers: dtos,
	})
}

func handleOffer(w http.ResponseWriter, r *http.Request, careerOpsPath string) {
	nStr := r.PathValue("n")
	n, err := strconv.Atoi(nStr)
	if err != nil {
		writeError(w, "invalid offer number", http.StatusBadRequest)
		return
	}
	apps := data.ParseApplications(careerOpsPath)
	for _, app := range apps {
		if app.Number == n {
			writeJSON(w, appToDTO(app, careerOpsPath, true))
			return
		}
	}
	writeError(w, fmt.Sprintf("offer %d not found", n), http.StatusNotFound)
}

func handleOfferState(w http.ResponseWriter, r *http.Request, careerOpsPath string) {
	nStr := r.PathValue("n")
	n, err := strconv.Atoi(nStr)
	if err != nil {
		writeError(w, "invalid offer number", http.StatusBadRequest)
		return
	}

	var body StateChangeDTO
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.State == "" {
		writeError(w, "invalid request body — expected {\"state\":\"...\"}", http.StatusBadRequest)
		return
	}

	apps := data.ParseApplications(careerOpsPath)
	var target *model.CareerApplication
	for i := range apps {
		if apps[i].Number == n {
			target = &apps[i]
			break
		}
	}
	if target == nil {
		writeError(w, fmt.Sprintf("offer %d not found", n), http.StatusNotFound)
		return
	}

	if err := data.UpdateApplicationStatus(careerOpsPath, *target, body.State); err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	target.Status = body.State
	writeJSON(w, appToDTO(*target, careerOpsPath, false))
}

func handleOfferLoc(w http.ResponseWriter, r *http.Request, careerOpsPath string) {
	nStr := r.PathValue("n")
	n, err := strconv.Atoi(nStr)
	if err != nil {
		writeError(w, "invalid offer number", http.StatusBadRequest)
		return
	}

	var body struct {
		Loc string `json:"loc"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Loc == "" {
		writeError(w, `invalid request body — expected {"loc":"..."}`, http.StatusBadRequest)
		return
	}

	apps := data.ParseApplications(careerOpsPath)
	var target *model.CareerApplication
	for i := range apps {
		if apps[i].Number == n {
			target = &apps[i]
			break
		}
	}
	if target == nil {
		writeError(w, fmt.Sprintf("offer %d not found", n), http.StatusNotFound)
		return
	}

	if target.ReportPath == "" {
		writeError(w, "offer has no report file — evaluate it first", http.StatusUnprocessableEntity)
		return
	}

	if err := data.SaveReportLocation(careerOpsPath, target.ReportPath, body.Loc); err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	target.Remote = body.Loc
	writeJSON(w, appToDTO(*target, careerOpsPath, false))
}

// ─── file handlers ───────────────────────────────────────────────────────────

var allowedDirs = []string{"config", "modes", "data", "reports", "interview-prep"}
var allowedTopFiles = []string{"cv.md", "portals.yml", "article-digest.md", "modes/_profile.md", "modes/_shared.md"}

func langForPath(path string) string {
	switch filepath.Ext(path) {
	case ".yml", ".yaml":
		return "yaml"
	case ".md":
		return "markdown"
	case ".json":
		return "json"
	case ".ts", ".js", ".mjs":
		return "javascript"
	default:
		return "text"
	}
}

func iconForPath(path string) string {
	switch filepath.Ext(path) {
	case ".yml", ".yaml":
		return "⚙"
	case ".md":
		if strings.HasPrefix(filepath.Base(path), "_") {
			return "✎"
		}
		if strings.Contains(path, "data/") {
			return "⌷"
		}
		if strings.Contains(path, "reports/") {
			return "📋"
		}
		return "✎"
	default:
		return "📄"
	}
}

func handleFiles(w http.ResponseWriter, _ *http.Request, careerOpsPath string) {
	var nodes []FileNodeDTO

	// Walk allowed directories
	for _, dir := range allowedDirs {
		dirPath := filepath.Join(careerOpsPath, dir)
		entries, err := os.ReadDir(dirPath)
		if err != nil {
			continue
		}
		for _, e := range entries {
			if e.IsDir() {
				continue
			}
			name := e.Name()
			if strings.HasPrefix(name, ".") {
				continue
			}
			relPath := dir + "/" + name
			nodes = append(nodes, FileNodeDTO{
				Path: relPath,
				Lang: langForPath(relPath),
				Icon: iconForPath(relPath),
			})
		}
	}

	// Add top-level files
	for _, f := range allowedTopFiles {
		fullPath := filepath.Join(careerOpsPath, f)
		if _, err := os.Stat(fullPath); err == nil {
			// avoid duplicates if already in allowedDirs
			duplicate := false
			for _, n := range nodes {
				if n.Path == f {
					duplicate = true
					break
				}
			}
			if !duplicate {
				nodes = append(nodes, FileNodeDTO{
					Path: f,
					Lang: langForPath(f),
					Icon: iconForPath(f),
				})
			}
		}
	}

	writeJSON(w, nodes)
}

func safePath(careerOpsPath, relPath string) (string, bool) {
	absBase, err := filepath.Abs(careerOpsPath)
	if err != nil {
		return "", false
	}
	clean := filepath.Clean(relPath)
	if strings.Contains(clean, "..") {
		return "", false
	}
	full := filepath.Join(absBase, clean)
	if !strings.HasPrefix(full, absBase+string(os.PathSeparator)) {
		return "", false
	}
	return full, true
}

func handleFileGet(w http.ResponseWriter, r *http.Request, careerOpsPath string) {
	relPath := r.PathValue("path")
	fullPath, ok := safePath(careerOpsPath, relPath)
	if !ok {
		writeError(w, "invalid path", http.StatusBadRequest)
		return
	}
	content, err := os.ReadFile(fullPath)
	if err != nil {
		writeError(w, "file not found", http.StatusNotFound)
		return
	}
	writeJSON(w, FileContentDTO{Path: relPath, Content: string(content)})
}

func handleFilePut(w http.ResponseWriter, r *http.Request, careerOpsPath string) {
	relPath := r.PathValue("path")
	fullPath, ok := safePath(careerOpsPath, relPath)
	if !ok {
		writeError(w, "invalid path", http.StatusBadRequest)
		return
	}

	var body FileContentDTO
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := os.WriteFile(fullPath, []byte(body.Content), 0644); err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, SaveResultDTO{OK: true})
}

func handleOfferPDF(w http.ResponseWriter, r *http.Request, careerOpsPath string) {
	nStr := r.PathValue("n")
	n, err := strconv.Atoi(nStr)
	if err != nil {
		writeError(w, "invalid offer number", http.StatusBadRequest)
		return
	}

	apps := data.ParseApplications(careerOpsPath)
	var target *model.CareerApplication
	for i := range apps {
		if apps[i].Number == n {
			target = &apps[i]
			break
		}
	}
	if target == nil {
		writeError(w, fmt.Sprintf("offer %d not found", n), http.StatusNotFound)
		return
	}

	// Construct the claude prompt
	company := target.Company
	role := target.Role
	url := target.JobURL
	prompt := fmt.Sprintf("Generate a PDF CV for offer #%d: %s — %s. URL: %s. Use the /career-ops pdf mode to customize the CV and generate the PDF.", n, company, role, url)

	// Spawn claude with a 2-minute timeout
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	cmd := exec.CommandContext(ctx, "claude", "-p", prompt)
	cmd.Dir = careerOpsPath

	if err := cmd.Run(); err != nil {
		writeError(w, fmt.Sprintf("PDF generation failed: %v", err), http.StatusInternalServerError)
		return
	}

	writeJSON(w, PDFResultDTO{OK: true})
}
