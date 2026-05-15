package api

// OfferDTO is the JSON shape for a single job offer.
type OfferDTO struct {
	N          int     `json:"n"`
	Score      float64 `json:"score"`
	Date       string  `json:"date"`
	Company    string  `json:"company"`
	Title      string  `json:"title"`
	State      string  `json:"state"`
	Archetype  string  `json:"archetype"`
	Legitimacy string  `json:"legitimacy"`
	Loc        string  `json:"loc"`
	Comp       string  `json:"comp"`
	URL        string  `json:"url"`
	Notes      string  `json:"notes"`
	Report     string  `json:"report"`
	ReportMD   string  `json:"report_md,omitempty"`
}

// FileNodeDTO is the JSON shape for a file tree entry.
type FileNodeDTO struct {
	Path string `json:"path"`
	Lang string `json:"lang"`
	Icon string `json:"icon"`
}

// MetaDTO is the JSON shape for dashboard metadata.
type MetaDTO struct {
	User        string  `json:"user"`
	Project     string  `json:"project"`
	Version     string  `json:"version"`
	AvgScore    float64 `json:"avgScore"`
	TotalOffers int     `json:"totalOffers"`
	Generated   string  `json:"generated"`
	Candidate   string  `json:"candidate"`
	Location    string  `json:"location"`
}

// StateCountDTO is one kanban tab entry.
type StateCountDTO struct {
	ID    string `json:"id"`
	Label string `json:"label"`
	Count int    `json:"count"`
	Color string `json:"color"`
}

// OffersResponseDTO wraps offers + state counts for a single fetch.
type OffersResponseDTO struct {
	Meta   MetaDTO         `json:"meta"`
	States []StateCountDTO `json:"states"`
	Offers []OfferDTO      `json:"offers"`
}

// FileContentDTO wraps a single file's path and text content.
type FileContentDTO struct {
	Path    string `json:"path"`
	Content string `json:"content"`
}

// SaveResultDTO is returned after a successful PUT /api/files/.
type SaveResultDTO struct {
	OK bool `json:"ok"`
}

// PDFResultDTO is returned after POST /api/offers/{n}/pdf.
type PDFResultDTO struct {
	OK  bool   `json:"ok"`
	PDF string `json:"pdf,omitempty"`
	Err string `json:"error,omitempty"`
}

// StateChangeDTO is the request body for POST /api/offers/:n/state.
type StateChangeDTO struct {
	State string `json:"state"`
}
