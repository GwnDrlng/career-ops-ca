import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log("Navigating to Communitech jobs portal...");
    await page.goto("https://www1.communitech.ca/jobs", { waitUntil: "networkidle" });

    const snapshot = await page.content();
    console.log("=== Communitech Snapshot ===\n");
    console.log(snapshot.substring(0, 3000));

    // Extract job listings
    const jobs = await page.evaluate(() => {
      const results = [];
      const jobCards = document.querySelectorAll("[data-testid='job-card'], .job-card, li.job, article");
      
      jobCards.forEach((card) => {
        const titleEl = card.querySelector("h2, h3, [data-testid='job-title'], .job-title");
        const linkEl = card.querySelector("a");
        const companyEl = card.querySelector("[data-testid='company-name'], .company-name, .employer");
        
        if (titleEl && linkEl) {
          results.push({
            title: titleEl.textContent?.trim() || "",
            url: linkEl.href || "",
            company: companyEl?.textContent?.trim() || "Unknown"
          });
        }
      });
      
      return results;
    });

    console.log(`\n=== Found ${jobs.length} job listings ===\n`);
    jobs.slice(0, 20).forEach((job, i) => {
      console.log(`${i + 1}. ${job.title} | ${job.company}`);
      console.log(`   URL: ${job.url}\n`);
    });

  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await browser.close();
  }
})();
