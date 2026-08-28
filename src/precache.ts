const deploymentControlFiles = new Set(['staticwebapp.config.json', 'sw.js']);

/**
 * Azure Static Web Apps consumes staticwebapp.config.json at deploy time rather
 * than publishing it. Keep deployment-control files out of the runtime shell:
 * cache.addAll() is all-or-nothing, so a single Azure 404 prevents installation.
 */
export function precachePaths(relativeFiles: string[]): string[] {
  return ['/', ...relativeFiles
    .filter((file) => !deploymentControlFiles.has(file.replaceAll('\\', '/')))
    .map((file) => `/${file.replaceAll('\\', '/')}`)];
}
