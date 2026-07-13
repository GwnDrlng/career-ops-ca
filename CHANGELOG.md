# Changelog

## [1.8.0](https://github.com/GwnDrlng/career-ops-ca/compare/career-ops-v1.7.0...career-ops-v1.8.0) (2026-07-13)


### Features

* adapt contacto mode by contact type (recruiter/HM/peer/interviewer) ([9fd5a90](https://github.com/GwnDrlng/career-ops-ca/commit/9fd5a90896f20020f48455cd079b64fed491b89f))
* add --min-score flag to batch runner ([#249](https://github.com/GwnDrlng/career-ops-ca/issues/249)) ([cb0c7f7](https://github.com/GwnDrlng/career-ops-ca/commit/cb0c7f7d7d3b9f3f1c3dc75ccac0a08d2737c01e))
* add {{PHONE}} placeholder to CV template ([#287](https://github.com/GwnDrlng/career-ops-ca/issues/287)) ([e71595f](https://github.com/GwnDrlng/career-ops-ca/commit/e71595f8ba134971ecf1cc3c3420d9caf21eed43))
* add Block G — posting legitimacy assessment ([3a636ac](https://github.com/GwnDrlng/career-ops-ca/commit/3a636ac586659bb798ef46a0a9798478a1e28b0a))
* add Claude Code plugin manifests (path-stable) ([62b767d](https://github.com/GwnDrlng/career-ops-ca/commit/62b767dcc56e4c875ed70bf4fe799c254ecf8eea))
* add follow-up cadence tracker mode ([4308c37](https://github.com/GwnDrlng/career-ops-ca/commit/4308c375033c6df430308235f4324658a8353b81))
* add Gemini CLI native integration and evaluator script  ([#349](https://github.com/GwnDrlng/career-ops-ca/issues/349)) ([0853486](https://github.com/GwnDrlng/career-ops-ca/commit/0853486d2c01a35adafea2cc6b6d8c429b843588))
* add Gemini CLI native integration and evaluator script (closes [#344](https://github.com/GwnDrlng/career-ops-ca/issues/344)) ([0853486](https://github.com/GwnDrlng/career-ops-ca/commit/0853486d2c01a35adafea2cc6b6d8c429b843588))
* add GitHub Actions CI + auto-labeler + welcome bot + /run skill ([2ddf22a](https://github.com/GwnDrlng/career-ops-ca/commit/2ddf22a6a2731b38bcaed5786c4855c4ab9fe722))
* add LaTeX/Overleaf CV export mode with pdflatex compilation ([#362](https://github.com/GwnDrlng/career-ops-ca/issues/362)) ([b824953](https://github.com/GwnDrlng/career-ops-ca/commit/b824953d0e3b7f8c6105dfcce7e17257c95ce6cd))
* add LaTeX/Overleaf CV export mode with pdflatex compilation (closes [#47](https://github.com/GwnDrlng/career-ops-ca/issues/47)) ([b824953](https://github.com/GwnDrlng/career-ops-ca/commit/b824953d0e3b7f8c6105dfcce7e17257c95ce6cd))
* add multi-company routing to cover letter generator ([464c494](https://github.com/GwnDrlng/career-ops-ca/commit/464c494eac49e7322f53e0dfc3777765b2a8de2e))
* add Nix flake devshell with Playwright support ([c579fcd](https://github.com/GwnDrlng/career-ops-ca/commit/c579fcddebf793f00cfad8534fd74085c09017fb))
* add OpenCode slash commands for career-ops ([#67](https://github.com/GwnDrlng/career-ops-ca/issues/67)) ([93caaed](https://github.com/GwnDrlng/career-ops-ca/commit/93caaed49cbc9f3214f9beb66fb2281c3f2370e6))
* add provider adapters and Communitech scanner ([2a84a66](https://github.com/GwnDrlng/career-ops-ca/commit/2a84a66a1b7218ff79424968bc38d9733f9390f4))
* add scan.mjs — zero-token portal scanner ([8c19b2b](https://github.com/GwnDrlng/career-ops-ca/commit/8c19b2b59f7087689e004f3d48e912f291911373))
* add writing-samples folder for AI-detection-evading voice calibration ([9ae201d](https://github.com/GwnDrlng/career-ops-ca/commit/9ae201d0682a17e7006ed7902b42db8234212e97))
* **applier:** auto-fill identity + sensitive answers + Ashby custom widgets on the &lt;3.7 lane ([ba6349d](https://github.com/GwnDrlng/career-ops-ca/commit/ba6349d75ed9d261d18d5fd053f68f191a3885d8))
* **applier:** salary expectation = posting midpoint, local vault default ([7cc8c40](https://github.com/GwnDrlng/career-ops-ca/commit/7cc8c401b240bff449893a4496a98968bcf91982))
* **apply:** add Canadian application form guidance ([78665a7](https://github.com/GwnDrlng/career-ops-ca/commit/78665a7693a0b16772b5c844262c856cb75e18f7))
* **batch:** PM archetypes, Canadian/FR template i18n, Spanish remnants purged ([6203911](https://github.com/GwnDrlng/career-ops-ca/commit/6203911008771a8d84843e8c691f1057f10b2499))
* cloud scan + on-prem apply pipeline with safety/governance layer ([f5b7498](https://github.com/GwnDrlng/career-ops-ca/commit/f5b7498df4c51b74f497748899b361837c5e7da3))
* **cloud:** broaden scan coverage + de-weight industry match in grading ([2824473](https://github.com/GwnDrlng/career-ops-ca/commit/2824473872fdefe79d91a722e07ab67f25b3e316))
* **cloud:** compact Slack report + full report as file attachment ([233f507](https://github.com/GwnDrlng/career-ops-ca/commit/233f5071dfd0da471a34f921bee810d95e184e8a))
* **cloud:** deploy pipeline + on-demand scan, Slack /scan, spend summaries ([b8d42ba](https://github.com/GwnDrlng/career-ops-ca/commit/b8d42ba5acd556dac9f0a8cac321b8c2f28781e2))
* **cloud:** Workday scanner support + add banks, Ashby boards, Wiz ([affde8a](https://github.com/GwnDrlng/career-ops-ca/commit/affde8a2af0c3b739e3e807d9d215fa441d70e51))
* **cv:** add cv.output_format to route between html and latex generation ([b82bb5f](https://github.com/GwnDrlng/career-ops-ca/commit/b82bb5fb7c86ab3074a54eaf0f3186f81d41f417))
* **dashboard:** add Catppuccin Latte light theme with auto-detection ([ff686c8](https://github.com/GwnDrlng/career-ops-ca/commit/ff686c8af97a7bf93565fe8eeac677f998cc9ece))
* **dashboard:** add manual refresh shortcut ([#246](https://github.com/GwnDrlng/career-ops-ca/issues/246)) ([4b5093a](https://github.com/GwnDrlng/career-ops-ca/commit/4b5093a8ef1733c449ec0821f722f996625fcb84))
* **dashboard:** add progress analytics screen ([623c837](https://github.com/GwnDrlng/career-ops-ca/commit/623c837bf3155fd5b7413554240071d40585dd7e))
* **dashboard:** add rejected and discarded pipeline tabs ([7d05967](https://github.com/GwnDrlng/career-ops-ca/commit/7d05967389fb6185f0d6e566a4ba583ee3824e1e))
* **dashboard:** add vim motions to pipeline screen ([#262](https://github.com/GwnDrlng/career-ops-ca/issues/262)) ([d149e54](https://github.com/GwnDrlng/career-ops-ca/commit/d149e541402db0c88161a71c73899cd1836a1b2d))
* **dashboard:** aligned tables and markdown syntax rendering in viewer ([dbd1d3f](https://github.com/GwnDrlng/career-ops-ca/commit/dbd1d3f7177358d0384d6e661d1b0dfc1f60bd4e))
* **dashboard:** show tracker IDs in pipeline list ([8d289c6](https://github.com/GwnDrlng/career-ops-ca/commit/8d289c64e31f81cf447f75105b500d1feca21058))
* **evaluation:** add one-per-company rule with pre-evaluation conflict checks ([377a9b9](https://github.com/GwnDrlng/career-ops-ca/commit/377a9b98b953a6d4e12fa49f37c415434c50e462))
* expand portals.example.yml with 8 dev-tools companies + 23 search queries ([#140](https://github.com/GwnDrlng/career-ops-ca/issues/140)) ([b7f555d](https://github.com/GwnDrlng/career-ops-ca/commit/b7f555d7b9a7b23c875fa0d35584df534961dabe))
* **governance:** Part 7F — change control (config logging, prompt versioning, risk register) ([7db5718](https://github.com/GwnDrlng/career-ops-ca/commit/7db57187b69733251f3e533c30b2175dfef32313))
* Gwen Ops CA canadiana theme + UX improvements ([8e18e9f](https://github.com/GwnDrlng/career-ops-ca/commit/8e18e9f520243a61aab00760c65ed1140c2912ad))
* **i18n:** add Japanese README + language modes for Japan market ([20a2c81](https://github.com/GwnDrlng/career-ops-ca/commit/20a2c817486968ca42a534aa86838c797d599c10))
* **i18n:** add Quebec French modes (modes/fr-ca/) ([d4d41a3](https://github.com/GwnDrlng/career-ops-ca/commit/d4d41a3ce22c38258b20631c041b5d7102bf2ffc))
* **interview-prep:** add AI PM-specific questions subsection ([a816c6c](https://github.com/GwnDrlng/career-ops-ca/commit/a816c6c3a45ae87f89fafcba2ddc888aa1973679))
* **latex:** add tectonic engine auto-detect with pdflatex fallback ([4b71b2c](https://github.com/GwnDrlng/career-ops-ca/commit/4b71b2cbf4fd49d3882cdd8767e31727337fab34))
* **modes:** PM interview patterns, Canadian professional norms, pdf i18n fixes ([867f588](https://github.com/GwnDrlng/career-ops-ca/commit/867f5886675a1a6f660b1aa1516e9ea214104085))
* multi-CLI support via open agent skill standard ([#572](https://github.com/GwnDrlng/career-ops-ca/issues/572)) ([7605a5e](https://github.com/GwnDrlng/career-ops-ca/commit/7605a5ed68d0fd559374afec1cd8798c487e3ead))
* **normalize-statuses:** add French Canadian status aliases ([9a60282](https://github.com/GwnDrlng/career-ops-ca/commit/9a602820be6b2ac800e64a78e9919d183afbce0d))
* **pipeline:** wire curated-docgen lane to CV+CL generation ([7c578a0](https://github.com/GwnDrlng/career-ops-ca/commit/7c578a081a0b9b30227f772db8aa54241a038d1e))
* **pipeline:** wire route-&gt;applier handoff, enable live apply, 2x 5h budget ([f30cd46](https://github.com/GwnDrlng/career-ops-ca/commit/f30cd46f49d4af03d15c8996f15871deb4b9f035))
* **portals:** add Canada/Vancouver and automation companies to example template ([590ba6e](https://github.com/GwnDrlng/career-ops-ca/commit/590ba6e1b4b9d2d9d03893b7f5fdae920d4f9a0b))
* **portals:** PM-focused title filter, Canadian companies, Canadian search queries ([d81bdc0](https://github.com/GwnDrlng/career-ops-ca/commit/d81bdc0ea65eefba5630ec8ba87b049316165fb6))
* redesign CV template to centered navy/blue style ([7fff33f](https://github.com/GwnDrlng/career-ops-ca/commit/7fff33fec6d9e62b5da2a5e269541fbfda721c24))
* **scan:** add Canadian job board strategy and ATS landscape ([8e6b5ce](https://github.com/GwnDrlng/career-ops-ca/commit/8e6b5ce5d31ab24c1c5304ef9312f0b7ff9323b8))
* **shared:** PM-primary archetypes, Canadian comp guide, Canadian employment law, fix Spanish remnants ([7fb0056](https://github.com/GwnDrlng/career-ops-ca/commit/7fb0056dc790fa3578e10d88000a64bddc2c0f2d))
* **states:** add French Canadian aliases for all statuses ([34b7cb6](https://github.com/GwnDrlng/career-ops-ca/commit/34b7cb6b808387f8466c1bb96b787c79c80eaa41))
* track all scanned postings in WebUI + bind dashboard to localhost ([8e6763d](https://github.com/GwnDrlng/career-ops-ca/commit/8e6763d8895fe0a297ad2d2413027820d049e53b))
* **tracker:** track any tailored CV artifact (DOCX or PDF) in col 7 ([bd8df2e](https://github.com/GwnDrlng/career-ops-ca/commit/bd8df2e8a22be381c33e366e91ed1d7f653d0a9b))
* **web:** add SvelteKit web dashboard with Go HTTP API ([8e1b10a](https://github.com/GwnDrlng/career-ops-ca/commit/8e1b10a7c222c68b1a1c70198f9f1bc2469e80f9))
* **web:** files panel as third column, leaf right of name ([a6ea895](https://github.com/GwnDrlng/career-ops-ca/commit/a6ea8953c31ba24d6d2e41b35c91346cb045ae2d))
* **web:** larger top widget fonts/icons, remove leaf SVG dot ([4c82242](https://github.com/GwnDrlng/career-ops-ca/commit/4c822429a1f5995e75bba863cc7310bea98218c9))
* **web:** larger widget titles, consistent status mix text ([9f8e941](https://github.com/GwnDrlng/career-ops-ca/commit/9f8e9416eeeaf105cd585f522e46fbfd26b0a0e7))
* **webui:** add Discard action button and fix live tab counts ([d68ea5e](https://github.com/GwnDrlng/career-ops-ca/commit/d68ea5eb447a42b52ff4bb9f2614a46122eaba38))
* **webui:** add inline location editor to ReportPanel ([5dcfaed](https://github.com/GwnDrlng/career-ops-ca/commit/5dcfaed29a2151497b71d6a4fef7d2480e9827dd))
* **webui:** add inline location editor to ReportPanel ([cd38fdb](https://github.com/GwnDrlng/career-ops-ca/commit/cd38fdbd2097ba24b67c916fbb83a7a8dac56ad9))
* **webui:** consistent prep file display + open-in-new-tab ([43d298b](https://github.com/GwnDrlng/career-ops-ca/commit/43d298bf34e7e8369c539c62693979802a9dbedd))
* **webui:** surface related interview-prep files per offer ([37a977d](https://github.com/GwnDrlng/career-ops-ca/commit/37a977d76a56fd11bfe7215c44001f241b24c53d))
* **webui:** toggle skip state back to evaluated on second click ([5026759](https://github.com/GwnDrlng/career-ops-ca/commit/5026759ea38affffa91ccb528508ea01740b2ee2))


### Bug Fixes

* 10 bug fixes — resource leaks, command injection, Unicode, navigation ([cb01a2c](https://github.com/GwnDrlng/career-ops-ca/commit/cb01a2c2e3b7fc334b1c4594749ea40b0da8fc62))
* add data/ fallback to UpdateApplicationStatus ([#55](https://github.com/GwnDrlng/career-ops-ca/issues/55)) ([3512b8e](https://github.com/GwnDrlng/career-ops-ca/commit/3512b8ef4eb8ca967bc967664f8798af42b58a52))
* add stopword filtering and overlap ratio to roleMatch ([#248](https://github.com/GwnDrlng/career-ops-ca/issues/248)) ([4da772d](https://github.com/GwnDrlng/career-ops-ca/commit/4da772d3a4996bc9ecbe2d384d1e9d2ed75b9819))
* align portals.example.yml indentation for new companies ([26a6751](https://github.com/GwnDrlng/career-ops-ca/commit/26a675173e64dac09fd1524ff9a7c7061520e057))
* **applier:** parse Slack-wrapped URLs, reach ATS forms, robust fill selectors ([d93dcaf](https://github.com/GwnDrlng/career-ops-ca/commit/d93dcafca629c872e153e0aa250b3da5a16a5f89))
* **approval-consumer:** tolerate backtick-wrapped control commands ([2efb7e0](https://github.com/GwnDrlng/career-ops-ca/commit/2efb7e0c5c2d9b09b4ce338d22103ccd12a4d612))
* **ci:** correct first-interaction@v3 input names ([c5196a8](https://github.com/GwnDrlng/career-ops-ca/commit/c5196a8dd8ff05da51c72ea151f67e481f12c329))
* **ci:** gracefully handle missing dependency graph in dependency-review ([#343](https://github.com/GwnDrlng/career-ops-ca/issues/343)) ([7c5fecb](https://github.com/GwnDrlng/career-ops-ca/commit/7c5fecb00d60521f77b33724eb345a28257d8832))
* **ci:** gracefully handle missing dependency graph in dependency-review workflow ([#352](https://github.com/GwnDrlng/career-ops-ca/issues/352)) ([7c5fecb](https://github.com/GwnDrlng/career-ops-ca/commit/7c5fecb00d60521f77b33724eb345a28257d8832))
* **ci:** use pull_request_target for labeler on fork PRs ([#260](https://github.com/GwnDrlng/career-ops-ca/issues/260)) ([2ecf572](https://github.com/GwnDrlng/career-ops-ca/commit/2ecf57206c2eb6e35e2a843d6b8365f7a04c53d6))
* **cloud:** forbid digest tables, require one report per graded posting ([6dbd4b1](https://github.com/GwnDrlng/career-ops-ca/commit/6dbd4b112d2b49c8d7f63546a77586b51cac2f01))
* **cloud:** resolve Slack bot token before use, persist scan dedup to Blob ([a0d16ec](https://github.com/GwnDrlng/career-ops-ca/commit/a0d16ec946399e8fc773ded04908a1853fbd0e2f))
* **cloud:** scan reliability — parallel portals, always leave a trace, baked-in channel ([b6cb58b](https://github.com/GwnDrlng/career-ops-ca/commit/b6cb58b976d2fd97b281774f7e7e5ef06cf0ed50))
* **cloud:** stop orchestrator from calling load_skill ([794f9b8](https://github.com/GwnDrlng/career-ops-ca/commit/794f9b802b13edcaeb7e5abf48cc2c3448c24df1))
* **cloud:** upload report file via career-ops-ca token (has files:write) ([c12c277](https://github.com/GwnDrlng/career-ops-ca/commit/c12c27753e8666089171dfd90b2bbdd8170c2c64))
* correct _shared.md → _profile.md reference in CUSTOMIZATION.md (closes [#137](https://github.com/GwnDrlng/career-ops-ca/issues/137)) ([a91e264](https://github.com/GwnDrlng/career-ops-ca/commit/a91e264b6ea047a76d8c033aa564fe01b8f9c1d9))
* correct dashboard launch path in docs ([#80](https://github.com/GwnDrlng/career-ops-ca/issues/80)) ([2b969ee](https://github.com/GwnDrlng/career-ops-ca/commit/2b969eea5f6bbc8f29b9e42bedb59312379e9f02))
* correct duplicate tracker numbers and zero score display ([ad0382b](https://github.com/GwnDrlng/career-ops-ca/commit/ad0382b9feb2a9399c4d7644ec56bcceea21f3ac))
* **dashboard:** add row separators between all table rows in report viewer ([0ae5f5c](https://github.com/GwnDrlng/career-ops-ca/commit/0ae5f5ccfbf9a91400f399a49b5a218869e55aef))
* **dashboard:** base scroll on display lines, not raw source lines ([60754f9](https://github.com/GwnDrlng/career-ops-ca/commit/60754f97aacdff266306432a05762880acb38cb0))
* **dashboard:** restore FindRelatedFiles and SaveReportLocation dropped by v1.10.0 update ([51899cc](https://github.com/GwnDrlng/career-ops-ca/commit/51899cc46a350244a826c4d7dbc4ce846f87b33a))
* **dashboard:** show dates in pipeline list ([#298](https://github.com/GwnDrlng/career-ops-ca/issues/298)) ([e5e2a6c](https://github.com/GwnDrlng/career-ops-ca/commit/e5e2a6cffe9a5b9f3cec862df25410d02ecc9aa4))
* **dashboard:** update candidate identity to Gwen Darling + add docx generator ([d7838a8](https://github.com/GwnDrlng/career-ops-ca/commit/d7838a83770cef3ce496d05785d010626089908a))
* **dashboard:** word wrap prose lines and table cells in report viewer ([264f91f](https://github.com/GwnDrlng/career-ops-ca/commit/264f91f813ba8b5a4db074daf97f75cfb5a32425))
* ensure data/ and output/ dirs exist before writing in scripts ([#261](https://github.com/GwnDrlng/career-ops-ca/issues/261)) ([4b834f6](https://github.com/GwnDrlng/career-ops-ca/commit/4b834f6f7f8f1b647a6bf76e43b017dcbe9cd52f))
* filter expired WebSearch links before they reach the pipeline ([#57](https://github.com/GwnDrlng/career-ops-ca/issues/57)) ([ce1c5a3](https://github.com/GwnDrlng/career-ops-ca/commit/ce1c5a3c7eea6ebce2c90aebba59d6e26b790d3f))
* improve default PDF readability ([#85](https://github.com/GwnDrlng/career-ops-ca/issues/85)) ([10034ec](https://github.com/GwnDrlng/career-ops-ca/commit/10034ec3304c1c79ff9c9678c7826ab77c0bcbf7))
* liveness checks ignore nav/footer Apply text, expired signals win ([3a3cb95](https://github.com/GwnDrlng/career-ops-ca/commit/3a3cb95bdf09235509df72e30b3077623f571ea1))
* **liveness:** detect closed postings with applications-closed banner variants ([7f8217e](https://github.com/GwnDrlng/career-ops-ca/commit/7f8217e057b327980a797a682c4f01d3318edbbe))
* **merge-tracker:** filter seniority and location stopwords + require overlap ratio in roleFuzzyMatch ([7821113](https://github.com/GwnDrlng/career-ops-ca/commit/7821113261eeb32f99639ff076651ab2e7757209))
* prevent Claude from filling out web application forms ([49ddf75](https://github.com/GwnDrlng/career-ops-ca/commit/49ddf7535efbae970d5fcb21064c3822a4a28a41))
* prevent Claude from filling out web application forms ([4e6f355](https://github.com/GwnDrlng/career-ops-ca/commit/4e6f3552bcd00c1a17c90cbf6c80573cc55f7cee))
* **pt:** restore diacritical marks in PT-BR modes ([#358](https://github.com/GwnDrlng/career-ops-ca/issues/358)) ([3a4c596](https://github.com/GwnDrlng/career-ops-ca/commit/3a4c596cb0a522f562ba38b35c210facaf38a503))
* **pt:** restore diacritical marks in PT-BR modes ([#359](https://github.com/GwnDrlng/career-ops-ca/issues/359)) ([3a4c596](https://github.com/GwnDrlng/career-ops-ca/commit/3a4c596cb0a522f562ba38b35c210facaf38a503))
* **release:** sync VERSION and package.json via release-please-config ([6a3dc22](https://github.com/GwnDrlng/career-ops-ca/commit/6a3dc224337a1942bf2ebf18b9b275d94fc06e7a))
* **release:** sync VERSION file to 1.7.0 ([8e554cc](https://github.com/GwnDrlng/career-ops-ca/commit/8e554cc4437c3a58e813378abb9b35e2e08a007e))
* remove wellfound, lever and remotefront from portals.example.yml ([#286](https://github.com/GwnDrlng/career-ops-ca/issues/286)) ([ecd013c](https://github.com/GwnDrlng/career-ops-ca/commit/ecd013cc6f59e3a1a8ef77d34e7abc15e8075ed3))
* replace grep -P with POSIX-compatible grep in batch-runner.sh ([637b39e](https://github.com/GwnDrlng/career-ops-ca/commit/637b39e383d1174c8287f42e9534e9e3cdfabb19))
* restore modes/interview-prep.md accidentally removed in cleanup ([ef72022](https://github.com/GwnDrlng/career-ops-ca/commit/ef72022b5ee6befa16442c1064ba7fa5dc8da4a9))
* restore Offer as canonical status (received offer, not job opening) ([f2ea413](https://github.com/GwnDrlng/career-ops-ca/commit/f2ea4134d228234a18f001fdb714650ebc892466))
* **security:** resolve 5 CodeQL high-severity alerts ([edc95a3](https://github.com/GwnDrlng/career-ops-ca/commit/edc95a316e0fc15eb70a3978767aeb3f870aa713))
* test-all.mjs scans only git-tracked files, avoids false positives ([47c9f98](https://github.com/GwnDrlng/career-ops-ca/commit/47c9f984d8ddc70974f15c99b081667b73f1bb9a))
* **test:** remove shell-string go build to clear CodeQL injection alert ([096911e](https://github.com/GwnDrlng/career-ops-ca/commit/096911e336254e8be0b6f68d001d3bbd2272e89c))
* **update-system:** cross-check GitHub Releases API when VERSION file is stale ([b0ee6eb](https://github.com/GwnDrlng/career-ops-ca/commit/b0ee6ebfcec7920ea7590ada61f3c39324d22ebc))
* **update-system:** expand SYSTEM_PATHS to cover all language modes and current scripts ([34fe3fb](https://github.com/GwnDrlng/career-ops-ca/commit/34fe3fbd5782f7f57faf8ef4a245fbee6275a040))
* use candidate name from profile.yml in PDF filename ([7bcbc08](https://github.com/GwnDrlng/career-ops-ca/commit/7bcbc08ca6184362398690234e49df0ac157567f))
* use execFileSync to prevent shell injection in test-all.mjs ([c99d5a6](https://github.com/GwnDrlng/career-ops-ca/commit/c99d5a6526f923b56c3790b79b0349f402fa00e2))
* use fileURLToPath for cross platform compatible paths in tracker scripts ([#32](https://github.com/GwnDrlng/career-ops-ca/issues/32)) ([#58](https://github.com/GwnDrlng/career-ops-ca/issues/58)) ([ab77510](https://github.com/GwnDrlng/career-ops-ca/commit/ab775102f4586ae4663a593b519927531be27122))
* use hi@santifer.io in English README ([5518d3d](https://github.com/GwnDrlng/career-ops-ca/commit/5518d3dd07716137b97bb4d8c7b5264b94e2b9e9))
* use PAT for release-please to allow PR creation ([33a0e98](https://github.com/GwnDrlng/career-ops-ca/commit/33a0e988fccee65ed67152f37b2f2944d6d93d0f))
* use PAT for release-please to allow PR creation ([6ab8436](https://github.com/GwnDrlng/career-ops-ca/commit/6ab8436920c3ca6c1c8ecdcba998e8e9bb205fec))
* **webui:** anchor scroll + no-download for HTML prep files in new tab ([ed169b5](https://github.com/GwnDrlng/career-ops-ca/commit/ed169b59e62849b8927d5e5c1cb435a38a989f94))


### Performance Improvements

* compress hero banner from 5.7MB to 671KB ([dac4259](https://github.com/GwnDrlng/career-ops-ca/commit/dac425913620fe0a66916dda7ba8d8fc4c427d51))


### Reverts

* restore contacto.md mode file name ([d0486ab](https://github.com/GwnDrlng/career-ops-ca/commit/d0486abd969830219dfc4891cddcfe7231672480))
* restore oferta/ofertas mode file names ([338fdad](https://github.com/GwnDrlng/career-ops-ca/commit/338fdad4894186bd3f3c451addb807eb228552f4))

## [1.7.0](https://github.com/santifer/career-ops/compare/career-ops-v1.6.0...career-ops-v1.7.0) (2026-05-06)


### Features

* adapt contacto mode by contact type (recruiter/HM/peer/interviewer) ([9fd5a90](https://github.com/santifer/career-ops/commit/9fd5a90896f20020f48455cd079b64fed491b89f))
* add --min-score flag to batch runner ([#249](https://github.com/santifer/career-ops/issues/249)) ([cb0c7f7](https://github.com/santifer/career-ops/commit/cb0c7f7d7d3b9f3f1c3dc75ccac0a08d2737c01e))
* add {{PHONE}} placeholder to CV template ([#287](https://github.com/santifer/career-ops/issues/287)) ([e71595f](https://github.com/santifer/career-ops/commit/e71595f8ba134971ecf1cc3c3420d9caf21eed43))
* add Block G — posting legitimacy assessment ([3a636ac](https://github.com/santifer/career-ops/commit/3a636ac586659bb798ef46a0a9798478a1e28b0a))
* add Claude Code plugin manifests (path-stable) ([62b767d](https://github.com/santifer/career-ops/commit/62b767dcc56e4c875ed70bf4fe799c254ecf8eea))
* add follow-up cadence tracker mode ([4308c37](https://github.com/santifer/career-ops/commit/4308c375033c6df430308235f4324658a8353b81))
* add Gemini CLI native integration and evaluator script  ([#349](https://github.com/santifer/career-ops/issues/349)) ([0853486](https://github.com/santifer/career-ops/commit/0853486d2c01a35adafea2cc6b6d8c429b843588))
* add Gemini CLI native integration and evaluator script (closes [#344](https://github.com/santifer/career-ops/issues/344)) ([0853486](https://github.com/santifer/career-ops/commit/0853486d2c01a35adafea2cc6b6d8c429b843588))
* add GitHub Actions CI + auto-labeler + welcome bot + /run skill ([2ddf22a](https://github.com/santifer/career-ops/commit/2ddf22a6a2731b38bcaed5786c4855c4ab9fe722))
* add LaTeX/Overleaf CV export mode with pdflatex compilation ([#362](https://github.com/santifer/career-ops/issues/362)) ([b824953](https://github.com/santifer/career-ops/commit/b824953d0e3b7f8c6105dfcce7e17257c95ce6cd))
* add LaTeX/Overleaf CV export mode with pdflatex compilation (closes [#47](https://github.com/santifer/career-ops/issues/47)) ([b824953](https://github.com/santifer/career-ops/commit/b824953d0e3b7f8c6105dfcce7e17257c95ce6cd))
* add Nix flake devshell with Playwright support ([c579fcd](https://github.com/santifer/career-ops/commit/c579fcddebf793f00cfad8534fd74085c09017fb))
* add OpenCode slash commands for career-ops ([#67](https://github.com/santifer/career-ops/issues/67)) ([93caaed](https://github.com/santifer/career-ops/commit/93caaed49cbc9f3214f9beb66fb2281c3f2370e6))
* add scan.mjs — zero-token portal scanner ([8c19b2b](https://github.com/santifer/career-ops/commit/8c19b2b59f7087689e004f3d48e912f291911373))
* add writing-samples folder for AI-detection-evading voice calibration ([9ae201d](https://github.com/santifer/career-ops/commit/9ae201d0682a17e7006ed7902b42db8234212e97))
* **cv:** add cv.output_format to route between html and latex generation ([b82bb5f](https://github.com/santifer/career-ops/commit/b82bb5fb7c86ab3074a54eaf0f3186f81d41f417))
* **dashboard:** add Catppuccin Latte light theme with auto-detection ([ff686c8](https://github.com/santifer/career-ops/commit/ff686c8af97a7bf93565fe8eeac677f998cc9ece))
* **dashboard:** add manual refresh shortcut ([#246](https://github.com/santifer/career-ops/issues/246)) ([4b5093a](https://github.com/santifer/career-ops/commit/4b5093a8ef1733c449ec0821f722f996625fcb84))
* **dashboard:** add progress analytics screen ([623c837](https://github.com/santifer/career-ops/commit/623c837bf3155fd5b7413554240071d40585dd7e))
* **dashboard:** add rejected and discarded pipeline tabs ([7d05967](https://github.com/santifer/career-ops/commit/7d05967389fb6185f0d6e566a4ba583ee3824e1e))
* **dashboard:** add vim motions to pipeline screen ([#262](https://github.com/santifer/career-ops/issues/262)) ([d149e54](https://github.com/santifer/career-ops/commit/d149e541402db0c88161a71c73899cd1836a1b2d))
* **dashboard:** aligned tables and markdown syntax rendering in viewer ([dbd1d3f](https://github.com/santifer/career-ops/commit/dbd1d3f7177358d0384d6e661d1b0dfc1f60bd4e))
* **dashboard:** show tracker IDs in pipeline list ([8d289c6](https://github.com/santifer/career-ops/commit/8d289c64e31f81cf447f75105b500d1feca21058))
* expand portals.example.yml with 8 dev-tools companies + 23 search queries ([#140](https://github.com/santifer/career-ops/issues/140)) ([b7f555d](https://github.com/santifer/career-ops/commit/b7f555d7b9a7b23c875fa0d35584df534961dabe))
* **i18n:** add Japanese README + language modes for Japan market ([20a2c81](https://github.com/santifer/career-ops/commit/20a2c817486968ca42a534aa86838c797d599c10))
* **latex:** add tectonic engine auto-detect with pdflatex fallback ([4b71b2c](https://github.com/santifer/career-ops/commit/4b71b2cbf4fd49d3882cdd8767e31727337fab34))
* multi-CLI support via open agent skill standard ([#572](https://github.com/santifer/career-ops/issues/572)) ([7605a5e](https://github.com/santifer/career-ops/commit/7605a5ed68d0fd559374afec1cd8798c487e3ead))
* **portals:** add Canada/Vancouver and automation companies to example template ([590ba6e](https://github.com/santifer/career-ops/commit/590ba6e1b4b9d2d9d03893b7f5fdae920d4f9a0b))


### Bug Fixes

* 10 bug fixes — resource leaks, command injection, Unicode, navigation ([cb01a2c](https://github.com/santifer/career-ops/commit/cb01a2c2e3b7fc334b1c4594749ea40b0da8fc62))
* add data/ fallback to UpdateApplicationStatus ([#55](https://github.com/santifer/career-ops/issues/55)) ([3512b8e](https://github.com/santifer/career-ops/commit/3512b8ef4eb8ca967bc967664f8798af42b58a52))
* add stopword filtering and overlap ratio to roleMatch ([#248](https://github.com/santifer/career-ops/issues/248)) ([4da772d](https://github.com/santifer/career-ops/commit/4da772d3a4996bc9ecbe2d384d1e9d2ed75b9819))
* align portals.example.yml indentation for new companies ([26a6751](https://github.com/santifer/career-ops/commit/26a675173e64dac09fd1524ff9a7c7061520e057))
* **ci:** correct first-interaction@v3 input names ([c5196a8](https://github.com/santifer/career-ops/commit/c5196a8dd8ff05da51c72ea151f67e481f12c329))
* **ci:** gracefully handle missing dependency graph in dependency-review ([#343](https://github.com/santifer/career-ops/issues/343)) ([7c5fecb](https://github.com/santifer/career-ops/commit/7c5fecb00d60521f77b33724eb345a28257d8832))
* **ci:** gracefully handle missing dependency graph in dependency-review workflow ([#352](https://github.com/santifer/career-ops/issues/352)) ([7c5fecb](https://github.com/santifer/career-ops/commit/7c5fecb00d60521f77b33724eb345a28257d8832))
* **ci:** use pull_request_target for labeler on fork PRs ([#260](https://github.com/santifer/career-ops/issues/260)) ([2ecf572](https://github.com/santifer/career-ops/commit/2ecf57206c2eb6e35e2a843d6b8365f7a04c53d6))
* correct _shared.md → _profile.md reference in CUSTOMIZATION.md (closes [#137](https://github.com/santifer/career-ops/issues/137)) ([a91e264](https://github.com/santifer/career-ops/commit/a91e264b6ea047a76d8c033aa564fe01b8f9c1d9))
* correct dashboard launch path in docs ([#80](https://github.com/santifer/career-ops/issues/80)) ([2b969ee](https://github.com/santifer/career-ops/commit/2b969eea5f6bbc8f29b9e42bedb59312379e9f02))
* **dashboard:** show dates in pipeline list ([#298](https://github.com/santifer/career-ops/issues/298)) ([e5e2a6c](https://github.com/santifer/career-ops/commit/e5e2a6cffe9a5b9f3cec862df25410d02ecc9aa4))
* ensure data/ and output/ dirs exist before writing in scripts ([#261](https://github.com/santifer/career-ops/issues/261)) ([4b834f6](https://github.com/santifer/career-ops/commit/4b834f6f7f8f1b647a6bf76e43b017dcbe9cd52f))
* filter expired WebSearch links before they reach the pipeline ([#57](https://github.com/santifer/career-ops/issues/57)) ([ce1c5a3](https://github.com/santifer/career-ops/commit/ce1c5a3c7eea6ebce2c90aebba59d6e26b790d3f))
* improve default PDF readability ([#85](https://github.com/santifer/career-ops/issues/85)) ([10034ec](https://github.com/santifer/career-ops/commit/10034ec3304c1c79ff9c9678c7826ab77c0bcbf7))
* liveness checks ignore nav/footer Apply text, expired signals win ([3a3cb95](https://github.com/santifer/career-ops/commit/3a3cb95bdf09235509df72e30b3077623f571ea1))
* **liveness:** detect closed postings with applications-closed banner variants ([7f8217e](https://github.com/santifer/career-ops/commit/7f8217e057b327980a797a682c4f01d3318edbbe))
* **merge-tracker:** filter seniority and location stopwords + require overlap ratio in roleFuzzyMatch ([7821113](https://github.com/santifer/career-ops/commit/7821113261eeb32f99639ff076651ab2e7757209))
* **pt:** restore diacritical marks in PT-BR modes ([#358](https://github.com/santifer/career-ops/issues/358)) ([3a4c596](https://github.com/santifer/career-ops/commit/3a4c596cb0a522f562ba38b35c210facaf38a503))
* **pt:** restore diacritical marks in PT-BR modes ([#359](https://github.com/santifer/career-ops/issues/359)) ([3a4c596](https://github.com/santifer/career-ops/commit/3a4c596cb0a522f562ba38b35c210facaf38a503))
* **release:** sync VERSION and package.json via release-please-config ([6a3dc22](https://github.com/santifer/career-ops/commit/6a3dc224337a1942bf2ebf18b9b275d94fc06e7a))
* remove wellfound, lever and remotefront from portals.example.yml ([#286](https://github.com/santifer/career-ops/issues/286)) ([ecd013c](https://github.com/santifer/career-ops/commit/ecd013cc6f59e3a1a8ef77d34e7abc15e8075ed3))
* replace grep -P with POSIX-compatible grep in batch-runner.sh ([637b39e](https://github.com/santifer/career-ops/commit/637b39e383d1174c8287f42e9534e9e3cdfabb19))
* test-all.mjs scans only git-tracked files, avoids false positives ([47c9f98](https://github.com/santifer/career-ops/commit/47c9f984d8ddc70974f15c99b081667b73f1bb9a))
* **update-system:** cross-check GitHub Releases API when VERSION file is stale ([b0ee6eb](https://github.com/santifer/career-ops/commit/b0ee6ebfcec7920ea7590ada61f3c39324d22ebc))
* **update-system:** expand SYSTEM_PATHS to cover all language modes and current scripts ([34fe3fb](https://github.com/santifer/career-ops/commit/34fe3fbd5782f7f57faf8ef4a245fbee6275a040))
* use candidate name from profile.yml in PDF filename ([7bcbc08](https://github.com/santifer/career-ops/commit/7bcbc08ca6184362398690234e49df0ac157567f))
* use execFileSync to prevent shell injection in test-all.mjs ([c99d5a6](https://github.com/santifer/career-ops/commit/c99d5a6526f923b56c3790b79b0349f402fa00e2))
* use fileURLToPath for cross platform compatible paths in tracker scripts ([#32](https://github.com/santifer/career-ops/issues/32)) ([#58](https://github.com/santifer/career-ops/issues/58)) ([ab77510](https://github.com/santifer/career-ops/commit/ab775102f4586ae4663a593b519927531be27122))
* use hi@santifer.io in English README ([5518d3d](https://github.com/santifer/career-ops/commit/5518d3dd07716137b97bb4d8c7b5264b94e2b9e9))


### Performance Improvements

* compress hero banner from 5.7MB to 671KB ([dac4259](https://github.com/santifer/career-ops/commit/dac425913620fe0a66916dda7ba8d8fc4c427d51))

## [1.6.0](https://github.com/santifer/career-ops/compare/v1.5.0...v1.6.0) (2026-04-26)


### Features

* add Gemini CLI native integration and evaluator script  ([#349](https://github.com/santifer/career-ops/issues/349)) ([0853486](https://github.com/santifer/career-ops/commit/0853486d2c01a35adafea2cc6b6d8c429b843588))
* add Gemini CLI native integration and evaluator script (closes [#344](https://github.com/santifer/career-ops/issues/344)) ([0853486](https://github.com/santifer/career-ops/commit/0853486d2c01a35adafea2cc6b6d8c429b843588))
* add LaTeX/Overleaf CV export mode with pdflatex compilation ([#362](https://github.com/santifer/career-ops/issues/362)) ([b824953](https://github.com/santifer/career-ops/commit/b824953d0e3b7f8c6105dfcce7e17257c95ce6cd))
* add LaTeX/Overleaf CV export mode with pdflatex compilation (closes [#47](https://github.com/santifer/career-ops/issues/47)) ([b824953](https://github.com/santifer/career-ops/commit/b824953d0e3b7f8c6105dfcce7e17257c95ce6cd))
* **cv:** add cv.output_format to route between html and latex generation ([b82bb5f](https://github.com/santifer/career-ops/commit/b82bb5fb7c86ab3074a54eaf0f3186f81d41f417))
* **dashboard:** add rejected and discarded pipeline tabs ([7d05967](https://github.com/santifer/career-ops/commit/7d05967389fb6185f0d6e566a4ba583ee3824e1e))
* **dashboard:** show tracker IDs in pipeline list ([8d289c6](https://github.com/santifer/career-ops/commit/8d289c64e31f81cf447f75105b500d1feca21058))
* **latex:** add tectonic engine auto-detect with pdflatex fallback ([4b71b2c](https://github.com/santifer/career-ops/commit/4b71b2cbf4fd49d3882cdd8767e31727337fab34))
* **portals:** add Canada/Vancouver and automation companies to example template ([590ba6e](https://github.com/santifer/career-ops/commit/590ba6e1b4b9d2d9d03893b7f5fdae920d4f9a0b))


### Bug Fixes

* **ci:** correct first-interaction@v3 input names ([c5196a8](https://github.com/santifer/career-ops/commit/c5196a8dd8ff05da51c72ea151f67e481f12c329))
* **ci:** gracefully handle missing dependency graph in dependency-review ([#343](https://github.com/santifer/career-ops/issues/343)) ([7c5fecb](https://github.com/santifer/career-ops/commit/7c5fecb00d60521f77b33724eb345a28257d8832))
* **ci:** gracefully handle missing dependency graph in dependency-review workflow ([#352](https://github.com/santifer/career-ops/issues/352)) ([7c5fecb](https://github.com/santifer/career-ops/commit/7c5fecb00d60521f77b33724eb345a28257d8832))
* **liveness:** detect closed postings with applications-closed banner variants ([7f8217e](https://github.com/santifer/career-ops/commit/7f8217e057b327980a797a682c4f01d3318edbbe))
* **merge-tracker:** filter seniority and location stopwords + require overlap ratio in roleFuzzyMatch ([7821113](https://github.com/santifer/career-ops/commit/7821113261eeb32f99639ff076651ab2e7757209))
* **pt:** restore diacritical marks in PT-BR modes ([#358](https://github.com/santifer/career-ops/issues/358)) ([3a4c596](https://github.com/santifer/career-ops/commit/3a4c596cb0a522f562ba38b35c210facaf38a503))
* **pt:** restore diacritical marks in PT-BR modes ([#359](https://github.com/santifer/career-ops/issues/359)) ([3a4c596](https://github.com/santifer/career-ops/commit/3a4c596cb0a522f562ba38b35c210facaf38a503))
* **update-system:** cross-check GitHub Releases API when VERSION file is stale ([b0ee6eb](https://github.com/santifer/career-ops/commit/b0ee6ebfcec7920ea7590ada61f3c39324d22ebc))
* **update-system:** expand SYSTEM_PATHS to cover all language modes and current scripts ([34fe3fb](https://github.com/santifer/career-ops/commit/34fe3fbd5782f7f57faf8ef4a245fbee6275a040))

## [1.5.0](https://github.com/santifer/career-ops/compare/v1.4.0...v1.5.0) (2026-04-14)


### Features

* add --min-score flag to batch runner ([#249](https://github.com/santifer/career-ops/issues/249)) ([cb0c7f7](https://github.com/santifer/career-ops/commit/cb0c7f7d7d3b9f3f1c3dc75ccac0a08d2737c01e))
* add {{PHONE}} placeholder to CV template ([#287](https://github.com/santifer/career-ops/issues/287)) ([e71595f](https://github.com/santifer/career-ops/commit/e71595f8ba134971ecf1cc3c3420d9caf21eed43))
* **dashboard:** add manual refresh shortcut ([#246](https://github.com/santifer/career-ops/issues/246)) ([4b5093a](https://github.com/santifer/career-ops/commit/4b5093a8ef1733c449ec0821f722f996625fcb84))


### Bug Fixes

* add stopword filtering and overlap ratio to roleMatch ([#248](https://github.com/santifer/career-ops/issues/248)) ([4da772d](https://github.com/santifer/career-ops/commit/4da772d3a4996bc9ecbe2d384d1e9d2ed75b9819))
* **dashboard:** show dates in pipeline list ([#298](https://github.com/santifer/career-ops/issues/298)) ([e5e2a6c](https://github.com/santifer/career-ops/commit/e5e2a6cffe9a5b9f3cec862df25410d02ecc9aa4))
* ensure data/ and output/ dirs exist before writing in scripts ([#261](https://github.com/santifer/career-ops/issues/261)) ([4b834f6](https://github.com/santifer/career-ops/commit/4b834f6f7f8f1b647a6bf76e43b017dcbe9cd52f))
* remove wellfound, lever and remotefront from portals.example.yml ([#286](https://github.com/santifer/career-ops/issues/286)) ([ecd013c](https://github.com/santifer/career-ops/commit/ecd013cc6f59e3a1a8ef77d34e7abc15e8075ed3))

## [1.4.0](https://github.com/santifer/career-ops/compare/v1.3.0...v1.4.0) (2026-04-13)


### Features

* add GitHub Actions CI + auto-labeler + welcome bot + /run skill ([2ddf22a](https://github.com/santifer/career-ops/commit/2ddf22a6a2731b38bcaed5786c4855c4ab9fe722))
* **dashboard:** add Catppuccin Latte light theme with auto-detection ([ff686c8](https://github.com/santifer/career-ops/commit/ff686c8af97a7bf93565fe8eeac677f998cc9ece))
* **dashboard:** add progress analytics screen ([623c837](https://github.com/santifer/career-ops/commit/623c837bf3155fd5b7413554240071d40585dd7e))
* **dashboard:** add vim motions to pipeline screen ([#262](https://github.com/santifer/career-ops/issues/262)) ([d149e54](https://github.com/santifer/career-ops/commit/d149e541402db0c88161a71c73899cd1836a1b2d))
* **dashboard:** aligned tables and markdown syntax rendering in viewer ([dbd1d3f](https://github.com/santifer/career-ops/commit/dbd1d3f7177358d0384d6e661d1b0dfc1f60bd4e))


### Bug Fixes

* **ci:** use pull_request_target for labeler on fork PRs ([#260](https://github.com/santifer/career-ops/issues/260)) ([2ecf572](https://github.com/santifer/career-ops/commit/2ecf57206c2eb6e35e2a843d6b8365f7a04c53d6))
* correct _shared.md → _profile.md reference in CUSTOMIZATION.md (closes [#137](https://github.com/santifer/career-ops/issues/137)) ([a91e264](https://github.com/santifer/career-ops/commit/a91e264b6ea047a76d8c033aa564fe01b8f9c1d9))
* replace grep -P with POSIX-compatible grep in batch-runner.sh ([637b39e](https://github.com/santifer/career-ops/commit/637b39e383d1174c8287f42e9534e9e3cdfabb19))
* test-all.mjs scans only git-tracked files, avoids false positives ([47c9f98](https://github.com/santifer/career-ops/commit/47c9f984d8ddc70974f15c99b081667b73f1bb9a))
* use execFileSync to prevent shell injection in test-all.mjs ([c99d5a6](https://github.com/santifer/career-ops/commit/c99d5a6526f923b56c3790b79b0349f402fa00e2))
