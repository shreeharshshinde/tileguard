export class Reporter {
  constructor(format = 'text') {
    this.format = format;
  }

  printValidation(result) {
    if (this.format === 'json') {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(`${result.pass ? 'PASS' : 'FAIL'} ${result.source} (${result.duration}ms)`);
    console.log(`Layers: ${result.availableLayers.length}  Features: ${result.totalFeatures}`);
    for (const [name, layer] of Object.entries(result.layers)) {
      console.log(`  ${layer.valid ? 'ok' : 'xx'} ${name}: ${layer.featureCount}`);
    }
    for (const error of result.errors) console.error(`ERROR ${error.code}: ${error.message}`);
    for (const warning of result.warnings) console.warn(`WARN ${warning.code}: ${warning.message}`);
  }

  printValidationBatch(results) {
    if (this.format === 'json') {
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    const passed = results.filter((result) => result.pass).length;
    console.log(`TileGuard batch: ${passed}/${results.length} passing`);
    for (const result of results) this.printValidation(result);
  }

  printLint(result) {
    if (this.format === 'json') {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`${result.pass ? 'PASS' : 'FAIL'} ${result.source} (${result.duration}ms)`);
    for (const error of result.errors) console.error(`ERROR ${error.code}: ${error.message}`);
    for (const warning of result.warnings) console.warn(`WARN ${warning.code}: ${warning.message}`);
  }

  printRender(result) {
    if (this.format === 'json') {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`${result.pass ? 'PASS' : 'FAIL'} ${result.fixture} (${result.duration}ms)`);
    if (result.message) console.log(result.message);
    for (const error of result.errors || []) console.error(`ERROR ${error.code}: ${error.message}`);
  }

  printRenderSummary(results) {
    if (this.format === 'json') {
      console.log(JSON.stringify(results, null, 2));
      return;
    }
    const passed = results.filter((result) => result.pass).length;
    console.log(`Render fixtures: ${passed}/${results.length} passing`);
    for (const result of results) this.printRender(result);
  }
}
