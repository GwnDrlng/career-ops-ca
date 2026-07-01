import { defineSchedule } from "eve/schedules";
import slack from "../channels/slack.js";

// The job-pipeline channel ID -- keep this in sync with
// config/guardrails.yml's slack.job_pipeline_channel_id in the main repo.
const JOB_PIPELINE_CHANNEL_ID = "C0BF4H3V280";

export default defineSchedule({
  cron: "0 12 * * *", // once a day, 12:00 UTC (~7-8am ET depending on DST) -- adjust to taste
  async run({ receive, waitUntil, appAuth }) {
    waitUntil(
      receive(slack, {
        message:
          "Run the daily job scan and grading pipeline now, following your instructions.md state machine: " +
          "scan portals, grade each new posting, format each into a report, and post every graded report to this channel. " +
          "If there are no new postings, finish without posting anything.",
        target: { channelId: JOB_PIPELINE_CHANNEL_ID },
        auth: appAuth,
      }),
    );
  },
});
