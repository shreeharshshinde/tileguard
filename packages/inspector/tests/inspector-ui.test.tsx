import type { Diagnostic } from '@tileguard/core';
import type { VectorTileArtifact } from '@tileguard/tile-rules';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DiagnosticToolbar } from '../src/components/diagnostics/DiagnosticToolbar.js';
import { SettingsPanel } from '../src/components/settings/SettingsPanel.js';
import { StatisticsPanel } from '../src/components/statistics/StatisticsPanel.js';
import {
  useLayerStatistics,
  useSettings,
  useStatistics,
} from '../src/hooks/use-statistics-settings.js';
import { createInspectorStore } from '../src/store/inspector-store.js';

function createArtifact(): VectorTileArtifact {
  return {
    type: 'VectorTile',
    source: 'test.pbf',
    content: {
      layers: {
        roads: {
          name: 'roads',
          extent: 4096,
          version: 2,
          features: [
            {
              type: 2,
              geometryType: 'LineString',
              id: 1,
              properties: { highway: 'primary' },
              geometry: [
                [
                  [0, 0],
                  [10, 10],
                ],
              ],
            },
          ],
        },
      },
    },
  } as unknown as VectorTileArtifact;
}

function createDiagnostics(): Diagnostic[] {
  return [
    {
      ruleId: 'tile/coordinate-range',
      severity: 'warning',
      message: 'Coordinate out of range',
      artifact: {} as never,
      location: { layer: 'roads', featureIndex: 0 },
    },
  ];
}

function SettingsDebug(): JSX.Element {
  const settings = useSettings();
  return <div>{settings.showVertices ? 'vertices-on' : 'vertices-off'}</div>;
}

function StatisticsDebug({
  store,
}: {
  readonly store: ReturnType<typeof createInspectorStore>;
}): JSX.Element {
  const stats = useStatistics(store);
  const layers = useLayerStatistics(store);
  return (
    <div>
      total-{stats.totalLayers}-sort-{layers.sortKey}
    </div>
  );
}

describe('Inspector UI integration', () => {
  it('useSettings returns the default settings snapshot', () => {
    const html = renderToString(<SettingsDebug />);
    expect(html).toContain('vertices-off');
  });

  it('StatisticsPanel renders loaded tile statistics', async () => {
    const store = createInspectorStore();
    await store.load('test.pbf', createArtifact(), createDiagnostics());
    const html = renderToString(<StatisticsPanel store={store} />);
    expect(html).toContain('Statistics');
    expect(html).toContain('Layers');
    expect(html).toContain('Features');
  });

  it('SettingsPanel renders without an Inspector instance', () => {
    const html = renderToString(<SettingsPanel inspector={null} />);
    expect(html).toContain('Settings');
    expect(html).toContain('Keyboard shortcuts');
  });

  it('DiagnosticToolbar exposes geometry filters from the layer metadata', () => {
    const html = renderToString(
      <DiagnosticToolbar
        severity={{ error: true, warning: true, info: true }}
        activeLayers={new Set()}
        activeGeometryTypes={new Set()}
        geometryTypes={['Point', 'LineString']}
        layers={[
          {
            name: 'roads',
            featureCount: 4,
            geometryTypes: new Set(['LineString']),
          },
          {
            name: 'places',
            featureCount: 2,
            geometryTypes: new Set(['Point']),
          },
        ]}
        sortOrder="severity"
        onToggleSeverity={() => undefined}
        onToggleLayer={() => undefined}
        onToggleGeometryType={() => undefined}
        onSetSortOrder={() => undefined}
        onReset={() => undefined}
      />,
    );

    expect(html).toContain('Geometry');
    expect(html).toContain('Point');
    expect(html).toContain('LineString');
  });

  it('useStatistics and useLayerStatistics produce stable statistics output', async () => {
    const store = createInspectorStore();
    await store.load('test.pbf', createArtifact(), createDiagnostics());
    const html = renderToString(<StatisticsDebug store={store} />);
    expect(html).toContain('total-');
    expect(html).toContain('-sort-');
    expect(html).toContain('features');
  });
});
