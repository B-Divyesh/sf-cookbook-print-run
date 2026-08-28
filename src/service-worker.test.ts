import { describe, expect, it } from 'vitest';
import { precachePaths } from './precache';

describe('service worker precache manifest', () => {
  it('excludes Azure deployment control files so a production 404 cannot reject install', () => {
    const shell = precachePaths([
      'index.html',
      'assets/index-123.js',
      'assets/index-123.css',
      'manifest.webmanifest',
      'staticwebapp.config.json',
      'sw.js'
    ]);

    expect(shell).toEqual(['/', '/index.html', '/assets/index-123.js', '/assets/index-123.css', '/manifest.webmanifest']);
    expect(shell).not.toContain('/staticwebapp.config.json');
  });
});
