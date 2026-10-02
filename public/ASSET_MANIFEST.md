# Legacy public asset migration

Source: `C:\Users\ourid\Desktop\leadersWS`

Imported on 2026-07-18:

- `brand/`: club logo variants, ESTK institutional lockup, SVG icon, and favicon sizes
- `media/people/`: eight legacy leadership portraits
- `media/gallery/`: two gallery images and one 14 MB gallery reel
- `media/news/`: one editorial cover image
- `media/partners/`: eight legacy partner logo files, including duplicates; public partner status and usage rights require review
- `media/legacy/hero.mp4`: retained 96 MB source reel; intentionally not loaded by the homepage because it exceeds the performance budget

Excluded:

- all six files under the legacy `public/uploads/cv` folder; these are private membership application files and must never be copied into public storage

Verified source reel identifiers:

- Instagram `DVoh14PCC_w`
- Instagram `DVjVPfCCH4A`

Legacy database statistics were calculated through SQL at runtime. No database export was present in the source tree, so historical member, registration, event, sponsor, and contribution totals cannot be recovered safely from files alone.
