import {
  fetchDailyTokenUsage,
  fetchUsageDetails,
  summarizeUsageDetails,
} from '../lib/qclaw.mjs';

function readOption(name) {
  const prefix = `${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = process.argv.indexOf(name);
  if (index >= 0) return process.argv[index + 1];
  return undefined;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function today() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function run() {
  try {
    const date = readOption('--date') || today();
    const page = Number(readOption('--page') || 1);
    const pageSize = Number(readOption('--page-size') || 20);
    const daily = await fetchDailyTokenUsage();
    const details = await fetchUsageDetails({ startDate: date, endDate: date, page, pageSize });
    const summary = summarizeUsageDetails(details);
    const result = { date, daily, usage: summary };
    if (hasFlag('--records')) {
      result.records = details?.records || [];
    }

    if (hasFlag('--json')) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return;
    }

    const limit = Number(daily?.daily_token_limit) || 0;
    const used = Number(daily?.daily_token_used) || 0;
    const remaining = limit > 0 ? limit - used : undefined;
    process.stdout.write(`date: ${date}\n`);
    process.stdout.write(`daily_token_limit: ${limit}\n`);
    process.stdout.write(`daily_token_used: ${used}\n`);
    process.stdout.write(`daily_token_remaining: ${remaining ?? '-'}\n`);
    process.stdout.write(`rpm_limit: ${daily?.rpm_limit ?? '-'}\n`);
    process.stdout.write(`usage_records_total: ${summary.totalRecords}\n`);
    process.stdout.write(`usage_tokens_total_in_page: ${summary.totalTokens}\n`);
    process.stdout.write(`usage_cost_total_in_page: ${summary.cost}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`查询 QClaw 余额/用量失败：${message}\n`);
    process.exitCode = 1;
  }
}

run();
