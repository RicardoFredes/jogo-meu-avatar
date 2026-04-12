/* ============================================
   CONFIG LOADER - Loads all JSON configs
   ============================================ */

const ConfigLoader = (() => {
  async function loadJSON(path) {
    try {
      const resp = await fetch(path);
      if (!resp.ok) throw new Error(`Failed to load ${path}: ${resp.status}`);
      return await resp.json();
    } catch (err) {
      console.warn(`ConfigLoader: Could not load ${path}`, err);
      return null;
    }
  }

  async function loadAll() {
    // 1. Load UI config first (it tells us what to load)
    const uiConfig = await loadJSON('data/ui-config.json');
    if (!uiConfig) throw new Error('Could not load ui-config.json');
    Catalog.setUiConfig(uiConfig);

    // 2. Load body shapes and color palettes in parallel
    const [bodyShapes, colorPalettes] = await Promise.all([
      loadJSON('data/body-shapes.json'),
      loadJSON('data/color-palettes.json'),
    ]);

    if (bodyShapes) Catalog.registerBodyShapes(bodyShapes.shapes);
    if (colorPalettes) Catalog.registerColorPalettes(colorPalettes.palettes);

    // 3. Load all body part JSONs
    const bodyPartFiles = [
      'data/body-parts/face-shapes.json',
      'data/body-parts/eyes.json',
      'data/body-parts/eyebrows.json',
      'data/body-parts/noses.json',
      'data/body-parts/mouths.json',
      'data/body-parts/hair-back.json',
      'data/body-parts/hair-front.json',
      'data/body-parts/facial-hair.json',
      'data/body-parts/extras.json',
    ];

    const bodyParts = await Promise.all(bodyPartFiles.map(f => loadJSON(f)));
    bodyParts.forEach(data => {
      if (data) Catalog.registerCategory(data);
    });

    // 4. Load all clothing and accessory JSONs
    const clothingFiles = [
      'data/clothing/tops.json',
      'data/clothing/bottoms.json',
      'data/clothing/shoes.json',
      'data/clothing/full-body.json',
      'data/clothing/patterns.json',
    ];

    const accessoryFiles = [
      'data/accessories/head.json',
      'data/accessories/face.json',
      'data/accessories/body.json',
    ];

    const allItems = await Promise.all(
      [...clothingFiles, ...accessoryFiles].map(f => loadJSON(f))
    );
    allItems.forEach(data => {
      if (data) Catalog.registerCategory(data);
    });

    console.log('ConfigLoader: All configs loaded.');
  }

  return { loadAll };
})();
