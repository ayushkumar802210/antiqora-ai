/**
 * Antiqora AI Real System Metrics Service
 * Collects authentic OS metrics using Node.js os module
 */

const os = require('os');

function getRealSystemStatus(aiConfigured = false, aiProvider = 'gemini') {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsagePercent = Math.round((usedMem / totalMem) * 100);

  const cpus = os.cpus();
  const cpuModel = cpus && cpus.length > 0 ? cpus[0].model.trim() : 'Unknown Processor';
  const cpuCores = cpus ? cpus.length : 1;

  // Calculate approximate CPU load from core timings
  let totalIdle = 0;
  let totalTick = 0;
  cpus.forEach((cpu) => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });
  const cpuUsagePercent = totalTick > 0 ? Math.round(100 - (100 * totalIdle) / totalTick) : 0;

  return {
    online: true,
    platform: `${os.type()} ${os.release()} (${os.arch()})`,
    hostname: os.hostname(),
    uptimeSeconds: Math.floor(os.uptime()),
    cpu: {
      model: cpuModel,
      cores: cpuCores,
      usagePercent: Math.min(100, Math.max(0, cpuUsagePercent)),
    },
    memory: {
      totalBytes: totalMem,
      freeBytes: freeMem,
      usedBytes: usedMem,
      usagePercent: memUsagePercent,
    },
    desktopConnected: false, // Updated by Electron IPC if connected
    aiProvider,
    aiConfigured,
    screenSharingActive: false,
    microphoneActive: false,
  };
}

module.exports = {
  getRealSystemStatus,
};
