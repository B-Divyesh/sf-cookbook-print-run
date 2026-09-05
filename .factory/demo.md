# Dinner Binder demo

- URL: `https://cookbook-print-run.sociobot.in/demo`
- Query alias: `https://cookbook-print-run.sociobot.in/?demo=1`
- Samples: Lemony sheet-pan chickpeas, Herby couscous, and Cucumber mint salad
- Initial output: one cover/timeline and three recipe sheets
- Storage: `demo:dinner-binder:packet:v1`
- Real storage: `dinner-binder:packet:v1`, which demo mode never reads or writes
- Reset: “Reset demo” restores the initial sample recipes, packet name, and serving time
- Exit: “Start for real” deletes demo storage before opening the real recipe list

The persistent demo banner identifies the sandbox. Imports, edits, ordering, backups, printing, and offline reloads remain available inside it.
