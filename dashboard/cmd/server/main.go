package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/santifer/career-ops/dashboard/internal/api"
)

func main() {
	pathFlag := flag.String("path", "..", "Path to career-ops directory")
	portFlag := flag.Int("port", 8080, "HTTP port to listen on")
	flag.Parse()

	careerOpsPath := *pathFlag
	port := *portFlag

	// Verify the career-ops path is valid
	if _, err := os.Stat(filepath.Join(careerOpsPath, "data", "applications.md")); err != nil {
		// Try applications.md at root
		if _, err2 := os.Stat(filepath.Join(careerOpsPath, "applications.md")); err2 != nil {
			fmt.Fprintf(os.Stderr, "Error: could not find applications.md in %s or %s/data/\n", careerOpsPath, careerOpsPath)
			os.Exit(1)
		}
	}

	mux := http.NewServeMux()

	// Register API routes
	api.RegisterRoutes(mux, careerOpsPath)

	// Serve SvelteKit build output (production)
	webBuildDir := filepath.Join(careerOpsPath, "web", "build")
	if info, err := os.Stat(webBuildDir); err == nil && info.IsDir() {
		fs := http.FileServer(http.Dir(webBuildDir))
		mux.Handle("/", fs)
		log.Printf("Serving web build from %s", webBuildDir)
	} else {
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			fmt.Fprint(w, "career-ops API server running. Start the SvelteKit dev server: cd web && npm run dev")
		})
	}

	addr := fmt.Sprintf(":%d", port)
	log.Printf("career-ops web server listening on http://localhost%s", addr)
	log.Printf("career-ops path: %s", careerOpsPath)

	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
