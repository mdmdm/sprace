# Space Race source-to-browser mechanics audit

October 14, 2026. Bounded review of all five requested groups, beginning with
movement/terrain. This compares the selected `dev/XX` scripts, engine instruction
implementation, archived parameters and browser translation. **Original gameplay
execution and full scheduler fidelity remain unverified.** No campaign recovery,
intro restoration, engine rewrite or publication is part of this work.

## Evidence and instruction contract

Source paths below are relative to `examples/space-race/dev/XX/` unless qualified.
Labels identify executable script sections; line numbers refer to preserved files.
The browser level fixtures retain source paths/hashes and original saved parameters.
The compiled spring row remains checked against `BD100.SQB`/`BD100.REF` by
`test_archive.py`; it supplements the readable table without modifying it.

- `legacy/engine/getnum.c:435–496`: arithmetic uses C integer operators; USETASK
  changes the evaluation task then resumes evaluation of the following expression.
  `task.c:700–710` selects a task or NullTask. Consequently `USETASK aPlayer t5`
  reads the shoe-jump variable; `USETASK aPlayer tId` reads an ID. These are different
  contracts, not two spellings of an existence test.
- `task.c:718–723`: strict rectangle overlap. `sAddZone` in `1/ZONE.SEQ:71`
  stores point-zone bounds/priority. The selected native DLL disassembly establishes
  inclusive edges, highest priority and first-wins ties; isolated DLL execution
  remains unverified. See [zone evidence](BROWSER_LEVEL_EXPERIMENT.md).
- `process.c:397,515,619–667`: SLIP assigns an absolute scheduled time; DELAY adds
  time; SPEED controls ordinary bitmap yields; IMMED bypasses that bitmap delay.
  `process.c:339` and manual DRAWGROUP describe repaint grouping, not a global
  pause or a fixed animation delay. Browser subclocks quantize to 60ms.
- `1/ZONE.SEQ:47–68`: handlers run on changed zone index, not every contact tick.
  Wall/underside handlers set `t0=-2` to force re-entry. The browser currently
  resolves contact each tick. A faithful change needs previous zone identity,
  task zone mutation and task/event ordering together; this pass retains that
  explicitly documented approximation.
- `SHARE/layers.seq`, `SHARE/chanels.seq` and `task.c:313–340`: numeric layers and
  channels are concrete source contracts; child tasks inherit layer/speed, and
  equal-layer insertion differs for ordinary RUN and runHigher. Numeric drawing
  layers were corrected; equal-layer task insertion is still approximated.

**Evidence categories:** table contracts are static source evidence; regressions
are tested browser behavior. Owner reports (Porter Terror completed, Conundrum
solvable, Upchuck City springs defective) remain owner observations. No owner
recollection is used to override an instruction contract. None of these establish
observed original-runtime behavior.

## Audit matrix

Browser files: `T` = browser_elements/terrain.mjs, `I` = interactions.mjs,
`W` = world.mjs; `F` = browser_game/flow.mjs; `D` = drawing.mjs/scene.js.
Tests: `A` = browser_game/test_audit.mjs, `G` = test_world.mjs, `F-test` =
test_flow.mjs, `I-test` = browser_elements/test_interactions.mjs.
All paths are under `experiments/`. Test descriptions below identify cases.
“Retained” means a source review plus existing browser coverage, not full fidelity.

| Group / mechanic | Original source contract/location | Browser coverage, discrepancy and action | Regression / remaining uncertainty |
| --- | --- | --- | --- |
| 1 Walk/stay/duck | `1/Player.seq:177–194,235`, algStay/algWalk/algDuck; `1/KEYBOARD.SEQ:20–88` | T: 5px walking, counter0–4, stay1, duck7 retained. Space/fire/down/up/left/right source priority is richer than browser edge inputs. | Existing walk/release tests are in the earlier movement experiment; current game route tests cover walking. Held fire/up and simultaneous-key scheduling remain translation gaps. |
| 1 Jump/momentum/gravity | `Player.seq` algJump/sInertialMovement; selected `BD100.SQB` word3580; `ZONE.SEQ:47–68` | T **fixed October15**: retain gdX5 during continued walking on the same floor, restoring running impulse13 versus standing10. Previously repeated floor handling cleared gdX every tick. Vertical impulse−10 and gravity+4 unchanged. | A both directions, release-to-standing, saved Sporificator pit12 clearance; compiled jump and zone-entry guard asserted by archive audit. Full entry-only zone scheduling remains unresolved. |
| 1 Floors/landing/undersides | `Player.seq:342–375`, sPlatform/sHorSolidZone | T **fixed**: ordinary floor subtracts giX before alignment; underside clears giY; platforms keep X displacement. Flying contact aligns outside floor instead of restoring arbitrary old Y. | A recovered floor versus Bomb in the Middle terminal, underside and floating contacts; I-test horizontal laser expectation corrected120 instead of121. No swept collision added. |
| 1 Walls/boundaries | `Player.seq:138–143,379–412` | T **fixed**: wrap updates previous X, top/bottom clamp precedes point-zone selection, ambiguous side uses previous X. Removed extra post-contact clamp absent from source. | A bottom floor and wrap-wall probe. Flight wall response still simplified; source's ordered ELSE IF boundary chain retained for regular movement. |
| 2 Base floors, walls, pits | `1/LEVELS.SEQ` aLevel; `Objects.seq:402–477` aPit/aWall/aLadder | Exported saved rectangles/priorities retained. Laser pit fixed200ms animation substitutes RANDOM180–230. | G pit override; existing inclusive priority/tie tests. Missing native source/runtime still limits the contract. |
| 2 Platforms/terminals | `Objects.seq:483–516,874–880` | W/T: saved size-adjusted limits,2px/50ms, platform top alignment retained; terminal tested separately from ordinary floor. | G moving-platform carry/reversal; A terminal. Current-zone rider detection and current bitmap bounds replace `gPrevNumZone`/previous task rectangle. |
| 2 Springs | `Objects.seq:1867–1920` | Existing repair retained: p1+15 cap55, conditional shoe override, one spring's1→2→3→0 frames and frame-top alignment. Zero-power saved springs export as platforms. | G all19 Upchuck City parameters, height and entrance chain pass. DRAWGROUP/child timing and retained momentum during concurrent compression remain unresolved. Missing audio163 recorded. |
| 2 Ladders | `Player.seq:559–622`, sGoUp/sGoDown | T/F: up beam1→6 then−54; down+54 then6→1, centered X, input/shooting held. Retained. | I-test both sequences, F-test transitions. Exact return-to-player scheduling unresolved. |
| 2 Teleporters | `Objects.seq:797–861`, iActivate; `Player.seq:294–315` iTeleGo | T/F/D: source/destination beam0→5→0. **Intentional repair retained:** cyclic saved-index multi-endpoint routing; paired links alternate, lone links refuse. | F-test marked entrance route and all starts on links1/99. Broadcast winner and50ms object task phase unverified. |
| 2 Gates/switches/scanners | `Objects.seq:522–551,566–711` | I/T/D: saved links including0, matching key consumed, score20,6/10×50ms flicker and gate zone replacement retained. **Fixed** card/switch foot bounds and scanner's lack of an additional foot-Y condition. Horizontal gate static slot retained. | I-test all22 easy switches/event0, key refusal/flicker; A pickup boundaries. Scanner BUMP retry/task re-entry remains approximate. |
| 3 Mama spores | `Objects.seq:272–370`, aWeed/iWeedHit/iWeedDead | I/W: saved patrol bounds,10hp, corpse floor and score15 retained. Deterministic patrol/fire and rect contact replace random decisions and source moving dead zone. | I-test patrol/ten shots; G kick. Source turn5/fire4 task holds, zone contact versus sprite contact and1000ms blast-death commit remain gaps. |
| 3 Bats | `Objects.seq:1288–1388`, aBat/iBatRest/iBatDead | I/W **fixed**: resting bats remain shootable, re-hit gives4 points and resets rest; resting zone stays unique. Blast kill gives7 and removes rest platform. | A repeated resting hit; G shot/rest/blast. Fixed15s replaces RANDOM10–20s; idle/chase, left/right resting variants and22px placement versus23px visual remain approximations. |
| 3 Spores/towers | `Objects.seq:143–270`, aTower/aSpore/iSporeKill/jSporeKill | W/I/D **fixed**: blast kill also awards2/sound132; shot/blast/natural death retains unmirrored8→9 at160ms, stops contact and repeated awards. | A shot/blast scores, channels and both death frames. Walk/fall edge adjustment and landing3 still simplified; browser40-spore cap replaces available-task guard. |
| 3 Bullets/projectiles/kicks | `Objects.seq:934–1006,370–397`; `Player.seq:221–234,656–680` | I/F:9px/60ms bullets,6px/50ms weed shots, shared HitReaction for kick22/23 retained. Numeric bullet layer101 **fixed**, below player110. | F-test last real bullet/kick; G two kick hits/balloon restriction. Collision pass, child first-delay, source-frame kick bitmap collision and RANDOM149–153 remain approximated. |
| 3 Damage/invincibility/death | `Player.seq:318–335,476–533` | I/F: ordinary damage1, compactor4, protection30/8, explosion/pit lethality and eight death frames retained. Browser cancels active transitions/compression and freezes world during death. | I-test damage/protection; F-test eight frames/location; G blast during protection. Source iHit has no blanket invincibility guard; rectangle CLEAR/zone-entry/task timing influence hits. Browser blanket guard and contact knockback−6×face versus source object bounds±8 are documented differences. |
| 4 Inventory/pickups/health/lives | `Objects.seq:713–790,1053–1076`; `SHARE/DEFINES.SEQ:209` | W/I **fixed** foot X and Y conditions, life-cap overflow healing. Caps20,6 items/keys retained. **Intentional wrapper:** attempts include current life; max6 corresponds to five retries. Saved editor-mode life reward replaced by attempts. | A strict foot bounds/scanner distinction and overflow versus exact cap; G health/ammo refusal/O2. Browser compact item array/next selection differs from source fixed slots. |
| 4 Oxygen/helium | `Objects.seq:1076,1138`; `Player.seq:240–263,687–693` | W/T **fixed**: helium preserves existing jump momentum, applies inertial inflation, finishes inflation at frame0 and does not zero vertical momentum on deflation. O2 fills20. | A in-flight inflation/deflation; G six frames, eventual rise and no fire. Previous-zone inertia and simultaneous flying input still approximate. Airborne inflation can initially descend before rising, as the source allows. |
| 4 Other devices | `Objects.seq:1081–1120,1144–1190`; `Player.seq:265–273,696–702` | CO2 **fixed** to consume/no extra effect (A regression). Shoes, jetpack and soda remain explicitly untranslated and unconsumed. Static contracts traced: CO2 consumes/no action; shoes swap art and change jump speed; jet500 player steps; soda drops and triggers Mama burp. | Coverage gap, not scheduler ambiguity or a claim the source does nothing. Device use and corresponding alternate art/tasks need their own bounded implementation/tests. No new device advertised. |
| 4 Bomb placement/countdown | `Objects.seq:1125–1136,1193–1221` | W/D: H2/NO range6/20,60×60ms countdown, foot origin+8, supported-zone carry retained. Text countdown replaces source digit sprites. | G bomb teleport/platform support. **Fixed** balloon+10px placement (A H2/NO test); child proceed/countdown phase and full DeadZones/SolidZones scheduling remain gaps. |
| 4 Explosion/fire waves/destruction | `Objects.seq:1008–1050,1226–1283` | W/D **fixed** tail4→5→6 (absolute left6/7/8, right13/14/15): no duplicate first or suppressed last. Existing6px/100ms/range/wall probes, wall450ms removal and floor immediate fall retained. | A holds each tail100ms; G wall probes, lethality and destruction. Frame collision occurs on60ms game pass rather than source post-SLIP, Mama blast corpse commits early. |
| 5 Machinery/conveyor | `Objects.seq:27–136` | W/D: saved3 stations, paired trash art, rising16/press8, moving y2 and serialized ejection retained. **Fixed** channels136→4/137→7. Continuous belt carry remains intentional approximation. | G complete trash-machine cycle. No real route; random delay, LINETO interpolation and empty source sound interval unresolved. |
| 5 Frame timing/drawing layers | `SHARE/layers.seq`; Player/Objects explicit LAYER; `task.c:313–340` | New D queue **fixes** bombs100, bullets/explosions101, player110, spores114, Mama/bats115, weed shots116, blast120; destruction becomes120. Saved object layers retained. | A numeric occlusion order; G/F-test frame sequences. Equal-layer order, captured-background tasks, redraw rectangles and native compositing unverified. |
| 5 Sound triggers/channels | `SHARE/chanels.seq`; `Objects.seq:769–788,1228–1231,1042` | W/builder **fixed** milk160, health/life/O2/H2/NO on chWalk6, other inventory124 on ChPlayer (channel2); bombs on ChBomb5, breakables on ChEnv2=7. Original WAV160 exported with hash;163/169 absent. | A pickup/blast/breakable IDs/channels; existing audio hashes/channel replacement tests. Fixed kick choice, WebAudio mixing, music startup/channel timing remain approximated. |

## Decisions and validation

The source review identifies unresolved task-level behavior instead of treating
instruction names as an oracle. In particular, keep entry-only zones, player input
priority and dynamic enemy zones together as the next bounded scheduler/contact
investigation. Retain the cyclic teleport repair and attempt/checkpoint wrapper;
neither is silently recast as verified original behavior. No historical bytes or
saved coordinates/parameters changed.

The new A suite uses recovered Sporificator, Bomb in the Middle and Conundrum
layouts where relevant, with isolated entities for contract tests. The wave-tail
case advances the existing subclock in10ms observations to verify100ms holds,
independently of game-clock quantization. These are controlled regressions, not
completed level routes. Previous Conundrum and Upchuck City entrance route tests
remain active, with real zones/enemies; their scope remains bounded.

Validation:71 Node gameplay regressions (16 new),19 Python checks,1495 baseline
originals and41 recovered originals pass. Local game and standalone rebuild/QA
results are recorded below after packaging. Full original execution, scheduler,
complete level playtests and the shoe/jet/soda device tasks remain open.


Local smoke QA: served the rebuilt standalone package on127.0.0.1:8874, launched
Upchuck City, used Right/Space/F, observed Spring bounce, ammo19 and health20,
then paused. Heliobatica picked up/used helium, rose to y185, refused firing
(ammo20) and paused. Both remained playing with five attempts; no captured browser
warning/error logs. This confirms local loading, drawing/input and these bounded
observations; it is not a level completion or direct visual check of every fix.
[Paused Upchuck City smoke screenshot](reference/browser-game/audit-upchuck-smoke.png).

Both gallery/game and standalone package rebuilt. Runtime validation checked3689
asset references, selected WAV hashes, ZIP integrity and member hashes. Original
milk WAV160 is included unchanged. Frozen ZIP hash and all3652 /classic/ members
match the preservation archive exactly. Matrix is included in the standalone
package, and generated level source manifests now pin KEYBOARD/layers/channels
and engine getnum/task/process dependencies too. No public-site update occurred.


## Upchuck City upper-key follow-up — October14

**Owner observation:** white key and upper green scanner seemed unreachable with
current air steering. **Verified static mismatch:** `Player.seq` sInertialMovement
checks `gPrevZone == sFallZone`, not “player is not grounded.” Direction/jump
handlers read `SolidZones`, which can still describe the previous underside
handler even after the player has been aligned outside its rectangle. The browser
used grounded for both decisions and reduced the first departure impulse before
recording a fall zone. My earlier air-steering explanation described the arithmetic
but omitted its zone condition; its reach estimate was not a source-runtime oracle.

T now checks the remembered zone kind for freefall inertia and previous solid-zone
control, including algWalk's one-step continuation after underside departure.
Undefined startup/isolated-fixture zone still uses the existing fallback. The
browser retains its compression and per-tick zone approximations: this is a
correction to the source-conditioned rule, **not** validation of original spring
child scheduling or an assertion about which zone the native player retained
through every compression phase. Air steering remains the original drift toward
±1px/step; saved launch powers are unchanged.

**Tested browser route:** entrance → springs106/105/132/131 → white key69. At tick88,
player x290/y51 holds card5, health20, five attempts and remains playing. All real
zones/enemies are present; no coordinate placement, direct pickups or immunity
changes. [Controls, events and implementation hashes](reference/browser-game/upchuck-white-key-route.json).
The fixed trace failed to collect the key in the preceding translation. Three new
regressions cover departure impulse, previous-underside control and this route.
A fourth explicitly controlled fixture starts at saved spring129 with matching
card4 and checks that upper green scanner64 consumes it and triggers gate79.
That fixture establishes spring/scanner reach, not an entrance-to-green-card/scan
route. Bounded searches found no complete green-card/scan route; scoped failure
is not evidence of unsolvability. No complete level playtest was performed.

75 gameplay regressions and19 Python checks pass, including all19 spring strengths,
the existing Conundrum route and both archive integrity checks. Both local builds
are refreshed; /classic/ and historical packages remain intact. Public website
unchanged. Remaining task: record a complete ordinary-control approach to the
green card65 and scanner64 through the saved gate/teleporter puzzle; establish
original task/zone behavior separately.


Browser rendering QA replayed the retained88-step white-key inputs through the
unchanged game update in an isolated generated scene, then paused. It displayed
white card5 in the original HUD, score15, health20 and five attempts; no captured
warning/error logs. [Replay screenshot](reference/browser-game/upchuck-white-key-replay.png).
This is controlled regression playback, not a human complete level playtest.
The preceding implementation replayed with identical inputs ends with no key
at x288/y143; this before/after comparison confirms the bounded reach mismatch.
The player's existing local browser tab was left intact; reload to load rebuilt
modules. No saved spring parameter or historical byte was altered.


## Screenshot spring102 → spring92 transfer — October14

Owner confirms reaching the white key and green scanner after the previous-zone
repair, then identifies upper-right spring102 (478/70, saved8 → power23) and
spring92 (542/178, saved39 → power54) as a failed transfer. Target feet zone is
x542–575/y187–207. [Controlled approach results](reference/browser-game/upchuck-spring-transfer.json)
test every integer start x478–511 with real zones/enemies and80 right-held steps
following neutral activation. None reaches92. Rightmost start passes x538/y187,
x539/y195 and x540/y203, then x541/y211 below the target. This is a narrow
right-held fixture failure, not proof that all approaches or the level are impossible.

Source sSpring/aSpring does not directly clear giX; player algStay does. Browser
compression freezes normal player updates and explicitly clears momentum. The
original scheduler's effective momentum through compression remains unverified;
this is the next concrete contract to investigate before choosing a change.
Another source detail: feet are assigned after frames1/2/3, but not after the final
frame0. A temporary last-frame3 alignment experiment improved rightward reach
by1px and still missed92; it also invalidated the retained white-key input trace.
It was reverted without rebuilding/deploying it. Current per-frame0 launch alignment
is thus a documented translation discrepancy pending a combined compression/
scheduler correction, rather than a newly claimed original behavior.

No movement speed, saved power, layout or runtime code changed in this transfer
investigation.75 regressions pass after restoring the tested implementation.
Spring sound163 is triggered on source ChCharacter3; scoped local filename search
again finds no WAV163. No replacement sound added. Searches remain scoped.


## Compiled spring-control repair — October14

Owner located the bottom-right trap in the running session and clarified that
climbing left is not an escape with green gate closed. My earlier lower-climb
response only verified height gain, not an exit; that conclusion was insufficient.
Observed current session x565/y331, health19, ammo10, key4, score85, five attempts,
two open gates; after a brief Right test it was left paused without retry/reload.

The archived program resolves the discrepancy. `BD100.SQB` is an exact prefix of
selected `rel/data/Bd100.pag`; compact5 uses the same selected page. Its REF-named
`SolidZones` table at word3146 contains **8 entries, including sSpring224**. The
readable XX snapshot declares7 and excludes springs. Compiled algWalk31 at
word3561 sets gdX5/gdY0/giX0 but does **not** clear giY; the readable snapshot does.
Compiled aSpring223 at9166 draws1/2/3 with feet assignments, then0 without another
feet assignment. DRAWGROUP groups drawing; it does not freeze the player. Native
ZONES ignores type0, not type-1; while the activated spring retains the same index,
iTestZones preserves the previous spring kind even though its table flag is-1.
Compiled sHorSolidZone49 agrees with the readable ceiling response: ascent stops,
X displacement is undone, giX is retained. Removing the ceiling in a diagnostic
fixture still missed the transfer; a ceiling-specific relaxation is unsupported.
[Ceiling/source-word evidence](reference/browser-game/upchuck-ceiling-check.json).

T now includes spring in previous solid-zone input, permits movement/jump/duck
through compression, keeps moving X and normal jump momentum, preserves compiled
walking vertical momentum, and leaves feet at frame3 on launch. Source strength
and shoe override are unchanged. Player animation continues while walking and
retains its last frame on launch. The parent/player timing is still a60ms browser
translation of separate55/60ms tasks; full native scheduling is not established.
Archive audit and a new Python regression verify the release prefix,8-entry table
and compiled walk contract, avoiding another assumption from the readable snapshot.

[Before/after controls, events, hashes and captured-session observation](reference/browser-game/upchuck-spring-control-repair.json):
- Marked spring102→92 succeeds with Right from x493 (a positioned approach fixture),
  health20/five attempts. Identical preceding-code controls missed92.
- Lower-right fixture starts at x500/y427 without initial invincibility, fires10
  ordinary shots to defeat Mama, then holds Right. It traverses spring83 and
  reaches x613/y427 **with green gate79 still closed**, health20/five attempts.
  Preceding code ends bouncing at x568/y359. No enemy deletion or strength override.
- Updated entrance controls collect white key69 at tick67, x290/y46, health20.
  Green scanner still operates in a saved-spring129/card4 fixture. The earlier88-step
  route/replay remains dated evidence of the preceding implementation; exact inputs
  change when source-enabled spring steering becomes available.

81 Node/20 Python checks pass, including all19 spring strengths, ceiling responses,
Conundrum routing and both original preservation manifests. Current live capture
was preserved; new modules require reload, which restarts the active level. No
hot patch, public-site update or full level playtest is claimed.


Browser QA loaded a separate generated replay, leaving the owner's captured tab
untouched. The ordinary-shot/Right lower-approach fixture visibly ends beyond the
bottom spring at x613/y427, health20/ammo10/five attempts, while green gate remains
closed; no captured warning/error logs. [Repaired bottom exit](reference/browser-game/upchuck-bottom-exit-repaired.png).
This is controlled browser playback, not the owner's entire live route. Both local
builds rebuilt; standalone validation checked4729 runtime references and ZIP/hash
integrity. Concurrent existing Training Ground files were retained; their five
separate control/progression regressions also pass. No tutorial work was performed
as part of this repair. Frozen ZIP hash and all3652 /classic/ members are unchanged.


Latest check caveat: the81 recovered-game cases pass, while the separately edited
Training Ground suite now fails setup (older fixture lacks extra.ladder). The prior
five-practice-case pass predates those edits; no current full-suite pass is claimed.
That ongoing source/test work was preserved. Latest standalone packaging validates
5545 runtime references; the differing count reflects concurrent practice assets.


### October15: exit panel height

Removed scene’s unsupported aperture clip at y+14,height27. It removed the
upper14 rows of the opaque41-row door panels, causing the reported transparent
top third. `Objects.seq` aDoorPanel uses ENDTRANSP and a full initial TASKRECT.
Renderer now clips each panel only to that full rectangle during sliding.
Regression covers both full-height panel rectangles at closed/half/full offsets;
existing exported-PNG opacity tests remain. Browser Conundrum screenshot:
[full-height red exit](reference/browser-game/exit-door-full-height.jpg).
107 Node checks pass; this fixes browser compositing without changing artwork,
collision, animation duration, historical packages or frozen classic.

## October15 — intentional cyan-rim standing-jump assistance

Owner requests reliable standing jumps from laser pits' cyan rims. T now uses
horizontal13 for stationary grounded jumps facing across the approach rim
(saved bounds' outer15px, within3px of the pit's deck height). The source normal
standing impulse remains10; this assistance is an intentional browser behavior.
Running13 and vertical−10 are unchanged; no saved zones/art/hazards changed.
A tests six rim positions in both directions against Porter Terror's saved
floors/pit geometry (adjacent closed gate excluded), plus off-rim, other-deck
and facing-away counterexamples.109 Node checks pass including Crew Access.
Original runtime/full scheduler remain unverified.
