# Space Race browser stabilization audit

October 13, 2026. This is a translated desktop keyboard experiment. All original
historical bytes are preserved; no original player gameplay reference exists.
The runtime architecture for the wider engine remains undecided. Nothing was
published. Sources are the selected `dev/XX/1/Player.seq`, `Objects.seq`,
`LEVELS.SEQ`, `TABLES.SEQ`, shared definitions, engine `task.c`/`process.c`,
and the recovered manual. Level manifests pin their paths and hashes.

Current follow-up: [October14 source-to-browser audit](BROWSER_MECHANICS_AUDIT.md)
records all five groups, verified fixes, regression coverage and remaining gaps.
Its current results supersede the dated rows below where they differ.

## Mechanic-by-mechanic audit

| Translated mechanic | Original evidence | Current result and approximation |
| --- | --- | --- |
| Walk, stay, duck, jump, fall, wrap | Player algStay/algWalk/algJump/algFallDown, sInertialMovement, aPlayer | 5px walking, −10 jump impulse, +4 gravity, bounded fall, 640px wrap on 60ms steps. Input/state ordering and collision re-entry remain approximated. |
| Base floors, walls, ordinary pits | LEVELS aLevel; Objects aWall/aPit; Player horizontal/vertical handlers | Saved bounds/priorities retained; inclusive point zones, first priority tie. Wall alignment and floor midpoint handling translated. No swept collision; zone updates can differ from cooperative scheduling. |
| Laser pits, gates, hit/death | Objects aLaserPit/aLaserGate/aHorizGate; Player sDeadZone/sHorDeadZone/iHit | Barrier alignment, 1-point hit, 8-step protection; pits kill. Pit animation uses fixed 200ms instead of RANDOM180–230. Closed gates block while invincible. |
| Switches and scanners | Objects aSwitch/aLock/iEventRespond | Saved links including zero, matching keys consumed, 20 points, delayed gate removal; 6/10 cycles of 50ms off/on. Commit on 60ms clock; scanner collision retry scheduling approximated. |
| Cards, ammo, health, life goodies | Objects aCard/aGoodie | Six keys/items, type/value decoding, caps20, same-level pickup limits, refused pickups remain. Lives increase browser attempts; original editor-save mode awards500 instead. This is an intentional wrapper rule. Pickup horizontal checks use strict bitmap overlap rather than script’s additional foot-position tests. |
| Ladders | Player sGoUp/sGoDown | Ascent1→6 at departure then −54; descent +54 then6→1. Movement/shooting held during transitions. |
| Teleporters | Objects aTeleport/iActivate; Player iTeleGo | Source/destination beam0→5→0, relocation after departure, paired links. Multi-target links now cycle by saved index as an intentional browser repair; original scheduler winner remains unverified. |
| Mama spores and projectiles | Objects aWeed/iWeedHit/iWeedDead/aWeedFire | Saved patrol bounds, 10hp, 4px/300ms, projectiles6px/50ms, death corpse platform. Explosion now also leaves that platform and shows weed.7 briefly. Decisions/fire interval deterministic; original RANDOM and exact delayed death/task effects approximated. |
| Bullets and empty-ammo kick | Objects aBullet/iGuyHit/HitReaction; Player algKick/sShoot | Shared enemy-hit dispatch. Kick uses mirrored actual frames22/23, one hit pass per frame then holds23; balloon blocks kicks. Bullets stop at wall/upper solid. Kick sound fixed149 instead of RANDOM149–153; damage pass occurs after browser movement rather than inside original algKick. |
| Platforms and terminals | Objects aPlatform/aTerminal | 2px/50ms, saved size-adjusted limits, reversal, collision and carry. Browser zone updates use current position; original script can expose a previous bitmap rectangle. Riders identified using current grounded feet instead of gPrevNumZone. |
| Bats | Objects aBat/iBatRest/iBatDead | Rest platform on shot, 4/7 points, corpse on blast. Chase decisions deterministic, fixed15s rest versus RANDOM10–20s; no full original idle/turn schedule. |
| Towers and spores | Objects aTower/aSporeSource/aSpore/iSporeKill | Source-derived tower zones, seeded1-in-11 spawns/1000ms, animated movement/contact/shooting. Spore movement/edge reactions remain simplified; source kill sound132 now exported. |
| Spring | Objects aSpring/sSpring; compiled row173 | Correct Bd197 frames and saved power bounds; immediate browser launch and short frames replace child task/drawgroup delays. No original runtime comparison. |
| Oxygen and helium | Objects aUseSelection/jO2/jHE; Player algInflate/algBaloon/algDeflate | Oxygen fills health; inflation5→0, rise, deflate0→5, no firing. Flying collision, hit cancellation and inertia remain simplified. |
| Hydrogen/nitrogen placement | Objects jH2/jNO/sPieceFallDown/aCountDown | 60-step countdown, range6/20, feet probe uses item origin+8, vertical-wall relocation, solid/teleport/exit support, moving-zone relative carry, dead-zone no-fall behavior. Text countdown replaces source digit sprites. |
| Fire waves | Objects aExplosion/aFireWave | Replaced accumulated rectangle with actual frame rectangles of two travelling waves. Check x±15 at y and y−30 for vertical walls;6px/100ms, range6/20, three tail frames. Source super-dead hit ignores invincibility. 60ms quantization and first wave collision/render timing differ from independent original tasks. |
| Breakable walls/floors | Objects aWall2/aFloor/iProceedMe | Wall removes zone after450ms, source frame-specific x offsets and y+1; floor changes zone immediately;150ms frames. Underlying destroyed sprite placement comes from saved object. |
| Conveyor belt | Objects aConveier | Scrolling clipped belt,3px/100ms equivalent carry; three ejection/compactor stations. Rider carry is continuous1.8px/60ms instead of discrete100ms. |
| Trash and compactor machinery | Objects aTrashSource/sEjectTrash/sEjectStage2/aCompactedTrash/aTrashCompactor; manual LINETO | Added original paired trash frames, drop80px/s, belt30px/s, compression trigger, independent compacted-trash travel and80px/s suction. Compactor16 upward placements/100ms, STOP until trash,8 downward moves/100ms; y2 tracks moving task, y1 stays fixed, four-point damage. Seeded500–4000ms delays replace RANDOM; global active ejection is serialized. LINETO interpolated on60ms clock; compactor zone changes commit on100ms subclock. Source environment sound condition is retained literally, even though its y interval can be empty. |
| Audio | MUSIC/CHANELS; WAVE calls in Player/Objects | Original PCM copies and numbered channel replacement; missing169 remains recorded. Added132/136/137; fixed samples/volumes, immediate fallback music and Web Audio mixing are approximations. |
| Death, exit, retry, progression | Player jPlayerDead/sExitZone; LEVELS startup | Source frame sequences and score; world freezes during death/exit. Five-attempt wrapper, checkpoint storage, selection and numeric progression are new presentation. Historical next-level enters editor. |
| Other inventory/characters/editor | jCO/jJet/jSoda/jShoe; other task families | Untranslated devices are retained with an explicit message; alternate characters/editor/intro/campaign ending excluded. No unsupported foreground family occurs in selected saves. |

## Conundrum dead-end investigation

**Owner observation:** the marked screenshot identifies link1: #1 is saved
index58 at370/277, #2 is38 at368/61, #3 is53 at535/169. The earlier browser
went #1→#2→#3→#2→#3, trapping the player away from #1. **Static observations:**
all26 teleports have partners, all25 gates have switch/scanner triggers, all6
scanners have corresponding saved cards. Event0 is valid. Link1 has indices
38/53/58; link99 has31/41/42. These are three-way links, not simple pairs.
The other ten teleport links have two endpoints. No saved layout was changed.

`iActivate` assigns shared `gTeleX/gTeleY` for **every** matching destination,
then tests USETASK to decide whether to interrupt the player. The test does not
guard those assignments. `iTeleGo` reads the coordinates only after six beam
frames. `aBuildBoard` constructs saved objects in reverse; `runHigher` and the
normal `LAYER` reinsertions affect equal-layer order (`task.c` InsertLayer versus
InsertLayerAfter). A first-destination assumption is therefore unjustified.

**Rejected fixed-winner policies:** first matching saved destination produces
58→38→53→38, exactly the reported trap. The prior last-writer hypothesis produces
38→58→53→58, moving the trap to a different pair. Either fixed-extreme policy
makes one of three endpoints unreachable after the first hop. The previous
last-writer change was insufficient and its regression only checked individual
hops; it did not test continued reachability.

**Current browser repair:** cycle through matching teleporters in ascending saved
index order, wrapping after the last. Link1 is38→53→58→38, so the marked route is
#1→#2→#3→#1. Link99 is31→41→42→31. Two-endpoint links still go back and forth;
single endpoints refuse activation. No saved coordinates, IDs or historical
scripts were altered. This is an intentional deterministic gameplay repair,
not evidence that the original Windows scheduler cycled exactly this way.
The broadcast's original winner remains a reference-runtime investigation.

**Tested behavior:** the marked-route regression starts at the original entrance
with all real enemies/zones, waits20 ticks, walks right10 ticks, descends the
ladder, waits6 ticks, then walks right7 ticks to #1 at392/313. Repeated Up presses
and12-step animation waits traverse #1→#2→#3→#1 twice, retaining20 health/five
attempts. It does not reposition the player, remove enemies or override damage.
A second regression isolates teleport routing from unrelated enemies and checks
that each of the six starting endpoints on links1/99 visits all three and returns.
[Control trace and endpoint observations](reference/browser-game/conundrum-teleport-route.json)
record the two circuits. [Current iframe preview](reference/browser-game/conundrum-repaired.jpg).
The owner subsequently reported “Conundrum is now solvable” after the teleport
and floor-gate repairs (October13). This confirms browser solvability by owner
playtest; a recorded full route and original-runtime fidelity remain unverified.

## Playtest evidence and practical limits

[Browser record](reference/browser-game/browser-playtest.json): every numbered
level selected, loaded, right held650ms, jump/fire attempted, pause/retry/menu
checked. Levels5–8 additionally attempted Enter. No captured warning/error logs.
Observed helium in Heliobatica, ammo in Bats in the Trash, oxygen in Bomb in the
Middle, spring bounce in the last two layouts. Firing reduced ammo in10/12
snapshots; helium blocked shooting and Conundrum's snapshot had20 ammo. Screenshots
show the translated machinery, not original runtime behavior.

[Reproducible control exploration](reference/browser-game/playtest.json):
8 seeded input trajectories of up to3000 steps per layout (14 layouts;
336,000 steps maximum), with ordinary controls, no direct coordinate placement
or invincibility override. Finite coordinates and retry reset checked. Pickups,
gates, ladders/teleports and deaths were exercised. **Zero complete routes** were
found by this deliberately bounded exploration. That does not establish
unsolvability; it also does not support calling the set fully playtested end to
end. Porter Terror remains owner-completed in the earlier scene. Dedicated
regressions place entities directly to isolate machinery/kick/bomb behavior;
those fixtures are not player route evidence.

`make browser-test` passes52 cases. `make check` verifies1495 baseline originals,
41 recovered originals and Python format/decoder/preservation tests. Packaging
checks all runtime image/audio references, original audio hashes, ZIP integrity
and included file hashes. See [embedding instructions](../experiments/browser_game/README.md).

## Self-contained review build

`make browser-package` creates ignored
`experiments/browser_game/generated/space-race/` and `space-race.zip`.
It includes14 layouts, PNG/WAV assets, ES modules, manifests, integration notes,
and a local iframe test page. No CDN, remote service or original executable is
needed. Serve over HTTP(S); opening `file://` is unsupported. The final package was
loaded in an iframe on local server8872: Bats in the Trash rendered, audio
initialized, right input and spore damage were observed, and Pause worked. No
captured console warning/error logs. [Screenshot](reference/browser-game/embedded-build.jpg). Embedding uses a
regular iframe; focus/blur and page visibility pause the game, audio unlocks on
Play, optional storage is origin-scoped. Host framework, desired iframe height,
touch support and final deployment remain undecided. There is no host messaging
or auto-resize API. Nothing was published or uploaded.


## Floor-gate visual correction — October 13, 2026

Owner confirmed teleporters appear fixed, then observed opened horizontal gates
looked like solid floor despite functioning as fall zones. `Objects.seq`
`aHorizGate` draws permanent `IMMED horizgate` at lyBack+1 before the active
colored task. `LEVELS.SEQ` captures this into backbmp. After flicker/CLEAR/QUIT,
the unpowered slot remains visible. The browser omitted this background pass,
so deleting the active sprite exposed ordinary floor tiles.

Game and interaction renderers now draw archived doubled `horizgate.0` beneath
active foreground/player sprites. Its center is opaque black (RGBA0,0,0,255),
with retained metal edges; it visually cuts an opening into the floor. Colored
barriers still flicker and disappear, and collision timing remains unchanged.
This restores a source-described rendering layer without invented artwork or
historical changes. The existing52 logic regressions remain applicable; this
is a renderer correction, not a new interaction mechanic.

Visual QA used an isolated generated copy of the current scene, opening link88
via sendEvent and20 normal steps, then pausing before presentation. Both affected
horizontal gates (saved indices82/85) show black slots instead of floor tiles;
remaining colored barriers are intact. Screenshot:
[opened floor gates](reference/browser-game/open-floor-gates.jpg). This is a
controlled rendering fixture, not a player route completion. No captured browser
warnings/errors. Both edited JS files pass Node syntax checks; baseline1495 and
recovered41 integrity checks plus whitespace check pass. Both local game builds
and the static iframe ZIP were rebuilt; no publication.
