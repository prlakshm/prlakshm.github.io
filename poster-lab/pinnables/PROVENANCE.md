# Mixr poster — provenance of the two source posters

Both recovered by replaying the session's edit log; each reproduces its original
render with zero pixel difference.

| poster | exact file | URL (lab server :4517) | render |
|---|---|---|---|
| B cold headphones, Inter Tight word (Figma row 10) | `mixr-tiles-row10.html` | `?o=E&seed=12&export&obj=cold&word=layer&font=3` | `exports/src-row10-cold-seed12.png` |
| soft blobbed headphones + Schibsted word (Figma row 13) | `mixr-tiles-row13.html` | `?o=E&seed=12&export&obj=blobbed&word=blobbed&warp=1&font=schibsted` | `exports/src-row13-soft-schibsted-seed12.png` |

Pranavi's three Figma frames (page "02 · Posters", frames 86:41, 86:61, 88:72) are built from
these two: Frame 1 = row-13 poster + cold headphones (row 10) refracted + row-13 word refracted;
Frame 2 = row-10 poster + cold headphones refracted + row-13 word; Frame 3 = row-13 poster with a
whole-frame refraction. `compose-figma.py` rebuilds them at 1600×2000 with clean grout.
