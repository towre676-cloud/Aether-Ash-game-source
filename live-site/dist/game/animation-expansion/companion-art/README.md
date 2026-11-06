# Ash & Aether — animation preparation pack

This pack develops the proposed apprentice, mechanic and ceramic creature from the visual studies in this conversation. These designs have not been reconciled with the current game's canonical cast or integrated into its engine.

Open review.html in a browser to composite the portraits over the backgrounds and cycle expressions. The player works offline. Expression cycling is a review tool, not lip sync or articulated character animation.

The 18 selected dialogue portraits use a shared 1024 × 1024 alpha-enabled canvas with a bottom-center anchor. The six background plates use a 1920 × 1080 canvas, resized from approximately 1672 × 941 originals; this does not add native detail. Aspect ratios are preserved; source framing is not cropped. A common canvas does not guarantee anatomical landmark registration. Check eye, nose, chin, shoulder and costume landmarks before using rapid expression swaps.

manifest.json records each asset's identity, expression, dimensions, alpha verification, checksum and remaining production work. contact_sheet.jpg provides a complete visual index. The source generation prompts are included for reproducibility of intent; generation itself is not deterministic.

For dialogue implementation, render background, character portrait and live UI text as separate layers. Preload the current scene's expressions, preserve the portrait anchor, and swap textures at emotional beats. Do not bake dialogue into the paintings. Give the current speaker emphasis with composition and lighting rather than constant motion.

For articulated animation, separate hair, head, neck, torso, upper/lower arms, hands, eyelids, eyes and mouth into layers; paint hidden surfaces; register pivots; then rig and test deformations. The compact delivery uses lossless WebP illustrations, convertible to PNG; these are flattened images, not layered PSD files, meshes, rigs, mouth charts or frame-by-frame motion sequences. Resting expressions are not substitutes for a matched blink drawing. Do not stretch whole faces to simulate speech.

For cinematics, create a storyboard and timed animatic first. Separate foreground, midground and background and paint occluded areas before adding parallax. Keep camera movement within the painted image bounds. Preserve lighting direction and prop placement across consecutive shots. The sunset and night workshop plates are concept variants and require a continuity pass before cutting between them.

Suggested first scene: apprentice collects work gear; mechanism makes an unfamiliar sound; mechanic's attention changes; apprentice looks toward the bench; creature activates. Use held poses, eye direction, sound and selective motion to establish the scene before producing expensive movement.

Quality gate: review every face at phone size, check hands and equipment, compare costume straps and creature joints, verify transparent edges against light and dark backgrounds, test text clearance, then test actual engine loading and memory use. No engine performance or animation playback claim is made by this art pack.

The variants folder preserves 13 superseded first-pass images for visual exploration. They include paired compositions and matte problems, and are not the selected cutouts. The main manifest flags residual glow and the creature baked into the night workshop. Alpha presence alone is not a clean-matte certification.
