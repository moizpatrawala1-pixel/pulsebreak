# Pulsebreak Complete Game Design Document

Version: 1.0  
Target: Offline mobile arcade, ages 15-30  
Business model: Rewarded ads only, no forced ads, no energy system, no pay-to-win

## 1. Executive Vision

Pulsebreak is a one-thumb neon survival arcade game built around readable chaos, expressive clutch moments, and permanent progression. The player pilots a pulse shard through escalating digital stages, dodging hazards, collecting shards, building combo, breaking through danger with boost, and unlocking stylish cosmetics.

The goal is to feel premium within the first 10 seconds:

- Instant play from the home screen.
- Offline by default.
- Runs last 45 seconds to 4 minutes early, then 6-12 minutes for skilled players.
- Every run produces a visible reward: XP, coins, mission progress, ghost replay, achievement progress, or cosmetic progress.
- Rewarded ads feel like a player choice, not a toll.

### Design Pillars

1. Skill first: success comes from reaction, route reading, boost timing, and risk management.
2. One more run: failure is fast, readable, and usually feels avoidable.
3. Visible mastery: near misses, combo chains, ghost replays, and clutch saves create moments players want to share.
4. Long progression without pressure: permanent upgrades and cosmetics create goals, but no timers block play.
5. Ethical revenue: rewarded ads only, capped daily, never interrupting gameplay.

## 2. Player Loops

### Core Gameplay Loop

1. Pick mode: Classic Run, Daily Run, Zone Run, Ghost Challenge, or Event Run.
2. Enter Stage 1 of the current zone.
3. Dodge hazards, collect shards, trigger near misses, and build combo.
4. Fill Pulse Meter through shards, near misses, and perfect stage clears.
5. Use Boost to break hazards, score higher, survive elite phases, or secure a clutch.
6. Clear escalating stages and periodic bosses.
7. Crash or finish a milestone.
8. Receive coins, XP, shards, challenge progress, and replay highlight.
9. Upgrade skill tree, unlock cosmetics, claim missions, or retry.

Why players keep playing:

- The run constantly escalates, so a good player sees new mechanics instead of a flat endless speed ramp.
- Every decision has tension: safe lane, shard lane, near miss lane, or boost through danger.
- Score, combo, and ghost replay give immediate mastery feedback.
- Runs are short enough to restart instantly but deep enough for high-skill mastery.

### Meta Progression Loop

1. Runs generate Account XP, Coins, Pulse Cores, Blueprint Fragments, and cosmetic progress.
2. XP increases Account Level.
3. Account Levels unlock zones, modes, skill-tree branches, cosmetics, and mission slots.
4. Coins buy cosmetics and lower-tier upgrades.
5. Pulse Cores buy permanent skill-tree upgrades.
6. Blueprint Fragments unlock Epic, Legendary, and Mythic cosmetics.
7. Level 100 unlocks Ascension Prestige for long-term replay.

Why players return:

- They always have a near goal: next account level, next skin, next stage, next mission, next boss, next ghost.
- Progression is not locked behind ads or money.
- The game offers both skill goals and collection goals.

### Daily Retention Loop

1. Open game and claim daily login reward.
2. Check three Daily Missions and one Daily Seed Run.
3. Play Daily Run, which has the same seed for the day on that device.
4. Compare against yesterday's score and personal ghost.
5. Complete missions for coins, XP, and streak tokens.
6. Optional rewarded ad choices: double daily mission reward, lucky spin, revive, or double end-run coins.

Why players watch rewarded ads:

- The reward is attached to a moment they already care about.
- Revive protects a high-skill run.
- Double Rewards amplifies a good run, not a bad one.
- Lucky Spin has cosmetic fragments and visible odds.
- Extra Mission Reward feels like a bonus after effort, not a forced gate.

### Long-Term Retention Loop

1. Unlock new zones through account level and boss clears.
2. Complete zone mastery tracks.
3. Finish weekly challenges and seasonal collections.
4. Unlock rare cosmetics through achievement chains.
5. Improve ghost replays and challenge friends with offline codes.
6. Reach Level 100 and Ascend.
7. Each Ascension resets account level to 1 but keeps cosmetics and grants a permanent badge, small bonus, and Mythic reward track.

Why players stay for months:

- Zones add new hazards and visual identity.
- Ascension creates prestige without invalidating cosmetics.
- Seasonal tracks rotate cosmetics and challenge rules.
- Offline ghost sharing gives social pressure without servers.

## 3. Core Gameplay Redesign

### Controls

- Drag left/right anywhere to steer across five lanes.
- Tap Boost button or swipe up to activate Boost when Pulse Meter is full.
- Optional left/right tap mode for accessibility.
- Pause automatically when app is backgrounded.

### Core Run Rules

- Five lanes, portrait orientation.
- Player moves smoothly between lanes with immediate input priority.
- Hazards travel downward toward the player.
- Shards, near misses, and perfect clears build Pulse Meter.
- Boost lasts briefly, destroys most hazards, increases scoring, and creates viral moments.
- Boss hazards require pattern reading, not damage sponges.

### Scoring

Base score sources:

- Survival: 10 points per second, scales by stage.
- Shards: 40 points each, multiplied by combo.
- Near miss: 25 points plus Pulse Meter gain.
- Perfect stage: 250 points times stage index modifier.
- Boss clear: 1,000 points plus remaining Pulse Meter bonus.
- Boost break: 35 points per destroyed hazard, multiplied by combo.

Combo rules:

- Shard pickup: +1 combo.
- Near miss: +1 combo.
- Perfect hazard weave: +2 combo.
- Boost break chain: +1 per 4 destroyed hazards.
- Taking a shield hit: combo halves.
- Crash ends run.

Combo cap starts at 20x and can rise to 35x through skill-tree upgrades.

### Risk And Reward

Safe play earns survival rewards. Risky play earns faster Pulse, higher combo, and rarer spawn odds.

Risk examples:

- Shards spawn close to hazards.
- Near misses require passing within one lane of danger.
- Elite enemies leave small safe windows.
- Bosses telegraph high-value shards during dangerous patterns.

## 4. Run Progression With 25 Stages

The old generic endless curve becomes a staged run structure. Each stage lasts 25-45 seconds early and 45-75 seconds later. Every 5 stages adds a reward checkpoint. Every 7 stages adds a boss or mini boss. After Stage 25, the game continues indefinitely by looping stage families with higher intensity and combined modifiers.

| Stage | Name | Function | New Pressure | Reward Beat |
|---:|---|---|---|---|
| 1 | Calm Introduction | Teach lanes and shards | Slow single hazards | Starter XP |
| 2 | Speed Lift | Raise tempo | 12 percent speed increase | Coin packet |
| 3 | Split Paths | Teach route choice | Two-lane blockers | Shard bonus |
| 4 | Signal Drift | Add lane deception | Warning lines flicker before hazards | Mission progress |
| 5 | Gatebreaker Mini Boss | First pattern test | Three attack waves with fixed gaps | Pulse Core |
| 6 | First Chaos Event | Break rhythm | Random shard storm with safe lane swaps | Bonus coins |
| 7 | Boss: Metro Firewall | First boss | Sweeping walls and delayed gates | Zone fragment |
| 8 | Aftershock | Post-boss speed | Faster scroll plus more near-miss chances | XP bonus |
| 9 | Hazard Mix | Combine blockers | Walls plus stagger lanes | Coin packet |
| 10 | Elite Signal | Introduce elite enemies | Red elites resist basic boost | Pulse Core |
| 11 | Blind Corners | Reading challenge | Late telegraphs, wider hazards | Cosmetic progress |
| 12 | Overcharge | Boost training | Extra Pulse pickups with dense hazards | Boost bonus |
| 13 | Compression | Space squeeze | Track narrows for short windows | XP bonus |
| 14 | Boss: Circuit Tyrant | Boss 2 | Alternating lane locks and shard bait | Zone key |
| 15 | Neon Rain | Environmental hazard | Falling sparks obscure lanes lightly | Coin crate |
| 16 | Mirror Split | Pattern inversion | Safe lanes swap at mid-screen | Skill point shard |
| 17 | Elite Convoy | Elite wave | Multiple elite blockers with weak points | Pulse Core |
| 18 | Glitch Surge | Chaos event | Randomized fake hazards and real hazards | Lucky token |
| 19 | Velocity Gate | Speed mastery | High-speed narrow gates | XP bonus |
| 20 | Mini Boss: Null Lock | Control test | Temporary lane locks | Blueprint fragment |
| 21 | Boss: Void Sentinel | Boss 3 | Rotating safe lanes and pulse drains | Zone unlock progress |
| 22 | Shard Fever | Economy stage | High shard density with heavy risk | Coin burst |
| 23 | Collapse Grid | Endurance test | Track sections vanish briefly | Pulse Core |
| 24 | Chaos Stack | Mixed chaos | Two environmental modifiers at once | Rare fragment |
| 25 | Boss: Pulsebreaker | Capstone boss | Multi-phase attack, elites, pulse drains | Major reward chest |

### Indefinite Progression After Stage 25

Stages 26+ use a repeating formula:

- Stage number increases speed, hazard density, and elite chance.
- Every 5th stage is a reward checkpoint.
- Every 6th stage is a Chaos Event.
- Every 7th stage is a boss.
- Every 10th stage adds a new modifier pair.
- Every 25 stages repeats the Pulsebreaker with a new phase.

Endless scaling variables:

- Speed: +3 percent per stage after 25, soft-capped by readability.
- Hazard density: +2 percent per stage, capped per device performance.
- Elite chance: +1 percent every 2 stages, capped at 28 percent.
- Shard value: +5 percent every 5 stages.
- Boss reward: +15 percent every boss cycle.

## 5. Zones

Zones are unlockable worlds. Each zone changes visuals, music, hazard language, and boss identity while keeping controls consistent.

| Zone | Theme | Visual Style | Music Style | Hazards | Unlock Condition |
|---|---|---|---|---|---|
| Neon City | Street-level digital chase | Dark roads, cyan signage, coral hazard glow | Fast synthwave, tight percussion | Traffic walls, metro gates, signal drift | Default |
| Quantum Core | Reactor interior | White-hot cores, teal rings, gold sparks | Arpeggiated electronic, rising tension | Rotating lanes, pulse drains, overcharge beams | Account Level 8 and Stage 7 clear |
| Void Network | Deep network space | Black glass, violet nodes, thin grid lines | Minimal bass, wide pads, glitch hats | Vanishing tiles, fake hazards, silence zones | Account Level 16 and Circuit Tyrant clear |
| Glitch Dimension | Broken simulation | Pixel tears, chromatic offsets, fragment trails | Bitcrushed hyperpop, syncopated drops | Inverted controls in short bursts, decoy shards, broken telegraphs | Account Level 26 and 25 Daily Missions |
| Singularity | Gravity collapse | Curved lanes, lensing light, red-orange warnings | Heavy cinematic bass, slowed pulses | Gravity wells, lane pull, expanding rings | Account Level 38 and Void Sentinel clear |
| Pulse Nexus | Endgame hub | Clean premium neon, prismatic gates, white energy | Hybrid orchestral-electronic, heroic hooks | Combined hazards from all prior zones | Account Level 55 and 3 zone mastery badges |

### Zone Mastery

Each zone has five mastery badges:

- Stage 10 clear.
- Stage 20 clear.
- Boss flawless.
- 30x combo.
- Zone-specific achievement chain.

Completing all five grants a Legendary skin or menu theme.

## 6. Progression System

### Resources

| Resource | Source | Use | Design Purpose |
|---|---|---|---|
| Account XP | Runs, missions, achievements, bosses | Account levels | Main sense of growth |
| Coins | Runs, shards, missions, login, rewarded double | Common to Epic cosmetics, early upgrades | High-frequency reward |
| Pulse Cores | Bosses, weekly challenges, achievements, prestige | Skill-tree upgrades | Permanent power progression |
| Blueprint Fragments | Zone mastery, achievements, events, lucky spin | Epic+ cosmetics | Collection chase |
| Streak Tokens | Daily login and daily missions | Streak shop | Daily retention without pressure |
| Ascension Marks | Prestige only | Mythic cosmetics, prestige branches | Long-term retention |

### Account Levels

Level cap before prestige: 100.

XP to next level:

`XPNext = round(80 + (Level ^ 1.42 * 42))`

This gives fast early levels and meaningful later levels without extreme grind.

Approximate pacing:

- Level 2: 125 XP, reached in 2-3 runs.
- Level 10: reached in 45-70 minutes.
- Level 25: reached in 5-7 days for casual players.
- Level 50: reached in 3-4 weeks.
- Level 100: reached in 10-14 weeks for engaged players.

### XP Sources

| Action | XP |
|---|---:|
| Finish a run | 20 |
| Every 500 score | 8 |
| Clear a stage | 15 + stage number |
| Clear a boss | 120 |
| Complete Daily Mission | 80 |
| Complete Weekly Challenge | 600 |
| Unlock achievement | 50-1,500 |
| First Daily Run | 120 |
| Perfect stage | 35 |
| New personal best | 100 |

### Milestone Rewards

| Level | Unlock Or Reward |
|---:|---|
| 2 | Daily Missions |
| 3 | Rewarded Revive |
| 4 | Cosmetic shop |
| 5 | Skill Tree: Reflex Core |
| 6 | Daily Login Calendar |
| 8 | Quantum Core zone |
| 10 | First Rare skin selector |
| 12 | Skill Tree: Pulse Engine |
| 15 | Weekly Challenges |
| 16 | Void Network zone |
| 20 | Extra Daily Mission slot |
| 25 | Epic Blueprint crafting |
| 26 | Glitch Dimension zone |
| 30 | Ghost Challenge Codes |
| 35 | Legendary achievements unlock |
| 38 | Singularity zone |
| 40 | Skill Tree: Discovery Circuit |
| 45 | Seasonal Event track |
| 50 | First Legendary skin quest |
| 55 | Pulse Nexus zone |
| 60 | Boss Rush mode |
| 70 | Mythic Blueprint fragments |
| 80 | Prestige preview and Ascension trials |
| 90 | Final skill-tree row |
| 100 | Ascension Prestige |

### Prestige: Ascension

At Level 100, the player can Ascend.

They keep:

- Cosmetics.
- Achievements.
- Zone badges.
- Lifetime stats.
- Ghost replays.

They reset:

- Account level to 1.
- Some mission unlock pacing.

They gain:

- Ascension Mark.
- Permanent +2 percent XP.
- Ascension frame on end screens.
- Access to Mythic cosmetic shop.
- One Prestige Skill node per Ascension, capped at 10.

Prestige bonuses must remain small. The goal is status and long-term goals, not making new players irrelevant.

## 7. Skill Tree

The Skill Tree opens at Level 5. It is permanent, offline, and purchased mainly with Pulse Cores. It should never invalidate player skill; upgrades make runs more expressive, not automatic.

### Tree Branches

1. Reflex Core: movement, lane correction, near-miss grace.
2. Pulse Engine: boost duration, boost recharge, boost impact.
3. Score Circuit: score multipliers, combo cap, perfect-stage bonuses.
4. Economy Circuit: coin multiplier, shard value, mission rewards.
5. Survival Matrix: shield, extra life, boss safety.
6. Discovery Circuit: rare spawns, blueprint chance, event drops.

### Upgrade Cost Formula

Base upgrade cost:

`CoreCost = round(BaseCost * Rank ^ 1.55)`

Coin support cost:

`CoinCost = round(CoreCost * 120)`

Early nodes use coins only. Mid nodes use coins plus cores. Late nodes use cores plus blueprint fragments.

### Upgrade Table

| Branch | Upgrade | Ranks | Effect Per Rank | Cost Pacing |
|---|---|---:|---|---|
| Reflex | Lane Snap | 5 | +3 percent lane movement response | 250 coins to 8 cores |
| Reflex | Near-Miss Window | 5 | +4 px grace for near-miss detection | 300 coins to 10 cores |
| Reflex | Recovery Slide | 3 | Shorter stun after shield hit | 4-16 cores |
| Reflex | Calm Start | 3 | +0.5 sec invulnerability at run start | 3-12 cores |
| Pulse | Boost Duration | 6 | +0.12 sec boost duration | 500 coins to 18 cores |
| Pulse | Boost Recharge | 6 | +4 percent Pulse gain | 500 coins to 18 cores |
| Pulse | Boost Break Score | 5 | +6 percent boost-break score | 4-16 cores |
| Pulse | Overdrive Exit | 3 | +0.4 sec post-boost shield shimmer | 8-24 cores |
| Score | Combo Cap | 5 | +3 max combo | 5-22 cores |
| Score | Perfect Stage | 5 | +7 percent perfect-stage score | 350 coins to 14 cores |
| Score | Boss Multiplier | 4 | +8 percent boss-clear score | 8-28 cores |
| Score | Clutch Chain | 3 | +1 combo after shield save | 10-32 cores |
| Economy | Coin Multiplier | 5 | +5 percent coins from runs | 400 coins to 20 cores |
| Economy | Shard Value | 5 | +3 percent shard coin value | 4-18 cores |
| Economy | Mission Bonus | 4 | +6 percent mission coins | 6-22 cores |
| Economy | Daily Bonus | 3 | +5 percent first-run reward | 8-24 cores |
| Survival | Failsafe Shield | 5 | Every rank improves one-hit shield cooldown; rank 5 gives one per run | 8-40 cores |
| Survival | Extra Life | 1 | One earned non-ad revive per Daily Run, unlocks late | 60 cores and Level 70 |
| Survival | Boss Guard | 4 | First boss hit deals shield break instead of crash | 10-34 cores |
| Survival | Pulse Anchor | 3 | Reduces pulse-drain hazards | 12-36 cores |
| Discovery | Rare Spawn Chance | 6 | +2 percent rare shard/event chance | 6-30 cores |
| Discovery | Blueprint Magnet | 5 | +3 percent blueprint drop chance | 8-34 cores |
| Discovery | Lucky Spin Quality | 4 | Removes lowest reward tier from spin pool at rank 4 | 10-38 cores |
| Discovery | Event Memory | 3 | Event currency bonus | 12-36 cores |

### Skill Tree Balancing Rules

- Maximum permanent score advantage before prestige: about 35 percent.
- Maximum permanent coin advantage before prestige: about 40 percent.
- Extra survivability should be late and limited.
- No upgrade should make a boss skippable.
- Rewarded revive remains valuable because earned survivability is scarce.
- New players should unlock their first upgrade within 15 minutes.
- A casual player should complete one branch in 3-5 weeks.
- A committed player should complete the full tree in 3-5 months.

## 8. Economy Design

### Baseline Earnings

Early player average per run:

- 80-180 coins.
- 70-180 XP.
- 0-1 Pulse Core every 5-8 minutes through bosses/missions.

Mid player average per run:

- 220-450 coins.
- 250-600 XP.
- 1-2 Pulse Cores per boss cycle.

Late player average per run:

- 600-1,200 coins.
- 800-1,800 XP.
- 3-6 Pulse Cores per deep run.

### Cosmetic Pricing Bands

| Rarity | Price | Expected Unlock Pace |
|---|---:|---|
| Common | 150-600 coins | Several per first day |
| Rare | 800-2,000 coins | 2-5 per week |
| Epic | 3,000-7,500 coins plus fragments | 1-3 per month |
| Legendary | Achievement, mastery, 12,000+ coins, fragments | Major goals |
| Mythic | Prestige, season finale, rare blueprint chain | Long-term status |

### Upgrade Pacing

- First upgrade by minute 12.
- First meaningful branch choice by minute 30.
- First rank 5 upgrade by day 3.
- First branch capstone by week 3.
- Full pre-prestige tree by month 4 for highly engaged players.

### Rewarded Ad Economy Guardrails

- Rewarded ads should increase daily earnings by 20-45 percent for opted-in players.
- Rewarded ads should not be required to finish a daily mission.
- Rewarded revive should be strongest during high-score runs, not farming runs.
- Daily ad caps prevent players from turning the game into a chore.

## 9. Rewarded-Only Monetization Plan

Pulsebreak should remove all forced interstitials and ship only rewarded ads.

### Rewarded Placements

| Placement | Unlock | Frequency | Reward | Why It Works |
|---|---:|---|---|---|
| Revive | Level 3 | 1 per run, 8 per day | Continue from crash with short shield | Saves emotional investment |
| Double Run Rewards | Level 4 | 5 per day | 2x coins and XP from a completed run | Celebrates a good run |
| Lucky Spin | Level 6 | 1 free plus 2 rewarded per day | Coins, cores, fragments, cosmetics | Daily habit with visible odds |
| Extra Mission Reward | Level 8 | 3 per day | +50 percent mission reward | Rewards effort after completion |
| Bonus Event Currency | Level 45 | 3 per day during events | +event tokens | Seasonal progression accelerator |
| Ghost Rematch Boost | Level 30 | 3 per day | Replay against a ghost with +10 percent reward if beaten | Skill-based motivation |

### Daily Limits

- Total rewarded ad soft cap: 15 per day.
- Hard cap: 20 per day.
- Revive cap: 8 per day.
- Lucky Spin cap: 2 rewarded per day.
- Double Rewards cap: 5 per day.
- Mission bonus cap: 3 per day.
- Event currency cap: 3 per day.

### Ad Placement Rules

- Never show an ad prompt during active gameplay.
- Never show an ad prompt after the first two runs.
- Never show more than two ad prompts on one results screen.
- Always let players continue without watching.
- Always show exact reward before the ad.
- If the ad fails, do not punish the player.
- If an ad completes, deliver the reward immediately.

### Revenue Optimization

Optimize for rewarded-ad impressions per daily active user without hurting retention.

Primary metrics:

- Day 1, Day 7, Day 30 retention.
- Runs per daily active user.
- Rewarded ad opt-in rate by placement.
- Rewarded ad completion rate.
- Post-ad next-run rate.
- Crash-to-revive conversion.
- Rewarded impressions per daily active user.
- Rewarded revenue per daily active user.

Healthy target ranges:

- Rewarded ad opt-in: 18-35 percent of daily active users.
- Revive opt-in on high-score crashes: 30-55 percent.
- Double Reward opt-in after personal best: 25-45 percent.
- No meaningful drop in next-run rate after an ad.

## 10. Daily, Weekly, And Seasonal Retention

### Daily Login Rewards: 30-Day Calendar

| Day | Reward |
|---:|---|
| 1 | 250 coins |
| 2 | 50 XP |
| 3 | 1 Pulse Core |
| 4 | 300 coins |
| 5 | Common skin ticket |
| 6 | 2 Lucky Tokens |
| 7 | Rare Blueprint Fragment x5 |
| 8 | 350 coins |
| 9 | 80 XP |
| 10 | 2 Pulse Cores |
| 11 | Trail fragment x5 |
| 12 | 450 coins |
| 13 | Lucky Token x3 |
| 14 | Rare skin ticket |
| 15 | 600 coins |
| 16 | 120 XP |
| 17 | 3 Pulse Cores |
| 18 | Boost effect fragment x5 |
| 19 | 700 coins |
| 20 | Epic Blueprint Fragment x5 |
| 21 | Menu theme fragment x5 |
| 22 | 850 coins |
| 23 | 180 XP |
| 24 | 5 Pulse Cores |
| 25 | Sound pack fragment x5 |
| 26 | 1,000 coins |
| 27 | Epic Blueprint Fragment x10 |
| 28 | Legendary Blueprint Fragment x3 |
| 29 | 8 Pulse Cores |
| 30 | Calendar Legendary skin quest unlock |

Missed days do not reset the calendar. Streak rewards are separate.

### Streak Bonuses

| Streak | Bonus |
|---:|---|
| 2 days | +5 percent first-run coins |
| 3 days | Extra Daily Mission reroll |
| 5 days | +1 Lucky Token |
| 7 days | Streak chest |
| 14 days | Rare fragment bundle |
| 21 days | Epic fragment bundle |
| 30 days | Streak title and Legendary quest progress |

Streak freeze tokens can be earned from achievements and calendar days. No paid streak restores.

### Daily Missions

Players receive three Daily Missions at Level 2 and four at Level 20.

Mission difficulty:

- Slot 1: easy, 3-6 minutes.
- Slot 2: medium, 8-15 minutes.
- Slot 3: skill, 15-25 minutes.
- Slot 4: zone or boss objective.

### Weekly Challenges

Weekly Challenges unlock at Level 15.

Examples:

- No Boost Week: clear Stage 12 without using Boost.
- Shard Hunter: collect 450 shards in any mode.
- Boss Ladder: defeat three bosses in one week.
- Ghost Week: beat your personal ghost five times.
- Zone Mastery Sprint: earn three perfect stages in one zone.
- Near-Miss Fever: record 200 near misses.

Rewards:

- 600-1,200 XP.
- 8-18 Pulse Cores.
- 10-30 Blueprint Fragments.
- Weekly title progress.

### Seasonal Events

Seasons last 28 days and remain offline. Event data ships in app updates or preloaded content packs.

Season structure:

- 20 free reward tiers.
- Event currency earned from runs, missions, and weekly challenges.
- Rewarded ads can add event currency up to the daily cap.
- Seasonal cosmetics return later through blueprint crafting.

Event themes:

- Midnight Circuit.
- Quantum Festival.
- Void Collapse.
- Glitch Parade.
- Singularity Trial.
- Pulse Anniversary.

## 11. Mission List

Daily mission templates:

1. Score 500 in one run.
2. Score 1,500 in one run.
3. Score 5,000 in one run.
4. Clear Stage 5.
5. Clear Stage 10.
6. Clear Stage 15.
7. Defeat one mini boss.
8. Defeat one boss.
9. Collect 20 shards.
10. Collect 75 shards.
11. Collect 150 shards.
12. Collect 10 shards in one stage.
13. Collect 3 rare shards.
14. Hit 5x combo.
15. Hit 10x combo.
16. Hit 20x combo.
17. Maintain combo for 30 seconds.
18. Trigger 15 near misses.
19. Trigger 50 near misses.
20. Trigger 8 near misses in one run.
21. Use Boost 3 times.
22. Use Boost 10 times.
23. Break 25 hazards with Boost.
24. Clear a stage while Boosting.
25. Finish a run without Boost.
26. Finish a run without collecting shards.
27. Clear Stage 7 without a shield hit.
28. Clear two perfect stages.
29. Earn a new personal best.
30. Beat yesterday's Daily Run score.
31. Beat your ghost replay.
32. Complete a Friend Challenge Code.
33. Play three zones.
34. Clear Neon City Stage 10.
35. Clear Quantum Core Stage 10.
36. Clear Void Network Stage 10.
37. Clear Glitch Dimension Stage 10.
38. Clear Singularity Stage 10.
39. Clear Pulse Nexus Stage 10.
40. Earn 1,000 coins.
41. Spend 500 coins.
42. Unlock one cosmetic.
43. Upgrade one skill-tree node.
44. Claim a login reward.
45. Complete all Daily Missions.
46. Open Lucky Spin.
47. Complete a run after watching a rewarded revive.
48. Double one run reward.
49. Complete a boss stage in Daily Run.
50. Share an end screen.

Weekly mission templates:

51. Clear Stage 20 in any zone.
52. Clear Stage 25.
53. Beat three ghosts.
54. Complete 15 Daily Missions.
55. Earn 30,000 total score.
56. Collect 600 shards.
57. Defeat 5 bosses.
58. Trigger 300 near misses.
59. Unlock 3 cosmetics.
60. Earn 5 perfect boss waves.

## 12. Achievement System

Achievements are permanent, offline, and visible in a gallery. Each achievement grants XP plus one extra reward.

Reward structure:

- Bronze: 50 XP and 100-300 coins.
- Silver: 150 XP and 400-900 coins.
- Gold: 400 XP and 1-3 Pulse Cores.
- Platinum: 900 XP and 5-10 Pulse Cores or fragments.
- Mythic: 1,500 XP and exclusive cosmetic or Ascension progress.

Unlock pacing:

- 15 achievements in first day.
- 35 achievements in first week.
- 65 achievements in first month.
- Final 20 are long-tail mastery goals.

### 100 Achievements

| # | Achievement | Requirement | Tier | Reward |
|---:|---|---|---|---|
| 1 | First Pulse | Complete 1 run | Bronze | 100 coins |
| 2 | Back Again | Complete 5 runs | Bronze | 150 coins |
| 3 | Habit Spark | Complete 25 runs | Bronze | 250 coins |
| 4 | Runner's Rhythm | Complete 100 runs | Silver | 700 coins |
| 5 | Endless Intent | Complete 250 runs | Gold | 2 cores |
| 6 | One More Run | Complete 500 runs | Platinum | 6 cores |
| 7 | True Circuit | Complete 1,000 runs | Mythic | Mythic trail quest |
| 8 | First Clear | Clear Stage 5 | Bronze | 150 XP |
| 9 | Into The Deep | Clear Stage 15 | Silver | 1 core |
| 10 | Past The Break | Clear Stage 25 | Gold | 4 cores |
| 11 | Triple Digits | Score 1,000 | Bronze | 150 coins |
| 12 | Neon Sharp | Score 5,000 | Bronze | 300 coins |
| 13 | Signal Climber | Score 10,000 | Silver | 800 coins |
| 14 | Pulse Artist | Score 25,000 | Silver | 1 core |
| 15 | Grid Legend | Score 50,000 | Gold | 3 cores |
| 16 | Six-Figure Signal | Score 100,000 | Platinum | 8 cores |
| 17 | Million Pulse | Lifetime score 1,000,000 | Gold | 5 cores |
| 18 | Ten Million Signal | Lifetime score 10,000,000 | Platinum | Legendary fragment x10 |
| 19 | Unbroken Score | Score 10,000 without revive | Gold | 4 cores |
| 20 | Daily Crown | Score 25,000 in Daily Run | Platinum | Rare title |
| 21 | Stage Walker | Clear 10 total stages | Bronze | 200 coins |
| 22 | Stage Rider | Clear 100 total stages | Silver | 1 core |
| 23 | Stage Architect | Clear 500 total stages | Gold | 5 cores |
| 24 | Stage Eternal | Clear 2,000 total stages | Mythic | Mythic badge |
| 25 | Perfect Entry | Perfect clear Stage 1 | Bronze | 200 coins |
| 26 | Perfect Stack | Perfect clear 3 stages in one run | Silver | 900 coins |
| 27 | No Error Run | Perfect clear 7 stages in one run | Gold | 5 cores |
| 28 | Boss Gate | Reach a boss | Bronze | 300 coins |
| 29 | Boss Breaker | Defeat 10 bosses | Silver | 2 cores |
| 30 | Boss Archivist | Defeat 100 bosses | Platinum | Legendary fragment x15 |
| 31 | First Shard | Collect 1 shard | Bronze | 100 coins |
| 32 | Pocket Glow | Collect 100 shards | Bronze | 250 coins |
| 33 | Shard Route | Collect 500 shards | Silver | 800 coins |
| 34 | Shard Surge | Collect 2,500 shards | Gold | 4 cores |
| 35 | Shard Storm | Collect 10,000 shards | Platinum | Epic blueprint x20 |
| 36 | Rare Catch | Collect 1 rare shard | Bronze | 300 coins |
| 37 | Rare Route | Collect 25 rare shards | Silver | Rare skin ticket |
| 38 | Rare Magnet | Collect 250 rare shards | Gold | 5 cores |
| 39 | Coin Flow | Earn 10,000 coins | Silver | 1 core |
| 40 | Coin Engine | Earn 100,000 coins | Platinum | Legendary fragment x10 |
| 41 | First Combo | Reach 5x combo | Bronze | 200 coins |
| 42 | Clean Chain | Reach 10x combo | Bronze | 300 coins |
| 43 | Pulse Chain | Reach 20x combo | Silver | 1 core |
| 44 | Combo Architect | Reach 30x combo | Gold | 4 cores |
| 45 | Impossible Thread | Reach 40x combo | Mythic | Mythic boost effect quest |
| 46 | Near Miss | Trigger 1 near miss | Bronze | 100 coins |
| 47 | Risk Taker | Trigger 50 near misses | Bronze | 300 coins |
| 48 | Close Call Pro | Trigger 500 near misses | Silver | 1 core |
| 49 | Edge Reader | Trigger 2,000 near misses | Gold | 5 cores |
| 50 | Clutch Signature | Trigger 10 near misses in 10 seconds | Platinum | Epic trail |
| 51 | First Boost | Use Boost once | Bronze | 150 coins |
| 52 | Boost Habit | Use Boost 50 times | Bronze | 300 coins |
| 53 | Boost Breaker | Destroy 100 hazards with Boost | Silver | 1 core |
| 54 | Overdrive Line | Destroy 1,000 hazards with Boost | Gold | 5 cores |
| 55 | Perfect Boost | Clear a boss phase using Boost | Silver | 1 core |
| 56 | Late Save | Activate Boost within 0.5 sec of crash | Gold | 4 cores |
| 57 | Revived Run | Use rewarded revive once | Bronze | 300 coins |
| 58 | Second Chance Win | Defeat boss after revive | Silver | 2 cores |
| 59 | No Revive Needed | Reach Stage 20 without revive | Gold | 5 cores |
| 60 | Final Spark | Clear Stage 25 with less than 5 percent Pulse | Platinum | Legendary fragment x10 |
| 61 | Neon Native | Earn Neon City badge | Bronze | 300 coins |
| 62 | Quantum Key | Unlock Quantum Core | Bronze | 500 coins |
| 63 | Void Key | Unlock Void Network | Silver | 1 core |
| 64 | Glitch Key | Unlock Glitch Dimension | Silver | 2 cores |
| 65 | Singularity Key | Unlock Singularity | Gold | 4 cores |
| 66 | Nexus Key | Unlock Pulse Nexus | Gold | 6 cores |
| 67 | City Master | Master Neon City | Gold | Legendary skin |
| 68 | Core Master | Master Quantum Core | Platinum | Legendary trail |
| 69 | Void Master | Master Void Network | Platinum | Legendary menu theme |
| 70 | Nexus Master | Master Pulse Nexus | Mythic | Mythic title |
| 71 | Daily Spark | Complete 1 Daily Mission | Bronze | 150 XP |
| 72 | Daily Routine | Complete 10 Daily Missions | Bronze | 300 coins |
| 73 | Daily Machine | Complete 50 Daily Missions | Silver | 2 cores |
| 74 | Daily Loyalist | Complete 150 Daily Missions | Gold | 6 cores |
| 75 | Calendar Start | Claim 3 login rewards | Bronze | 200 coins |
| 76 | Streak Seven | Reach 7-day streak | Silver | Rare fragment x10 |
| 77 | Streak Thirty | Reach 30-day streak | Platinum | Legendary quest |
| 78 | Weekly Winner | Complete 1 Weekly Challenge | Silver | 2 cores |
| 79 | Weekly Veteran | Complete 12 Weekly Challenges | Gold | Epic skin |
| 80 | Season Finisher | Complete a seasonal track | Platinum | Seasonal Legendary |
| 81 | First Skin | Unlock 1 skin | Bronze | 150 XP |
| 82 | Closet Starter | Unlock 5 skins | Bronze | 300 coins |
| 83 | Style Grid | Unlock 15 skins | Silver | Rare skin ticket |
| 84 | Collector | Unlock 35 skins | Gold | 5 cores |
| 85 | Curator | Unlock 60 skins | Platinum | Legendary fragment x15 |
| 86 | Hundred Signal | Unlock 100 skins | Mythic | Mythic menu theme |
| 87 | Trail Start | Unlock 1 trail | Bronze | 200 coins |
| 88 | Boost Style | Unlock 1 boost effect | Bronze | 200 coins |
| 89 | Sound Shift | Unlock 1 sound pack | Silver | 1 core |
| 90 | Full Fit | Equip skin, trail, boost, theme, and sound pack | Gold | Epic fragment x15 |
| 91 | Ghost Made | Save first ghost replay | Bronze | 200 coins |
| 92 | Ghost Beat | Beat your ghost | Bronze | 300 coins |
| 93 | Ghost Hunter | Beat 25 ghosts | Silver | 2 cores |
| 94 | Ghost Rival | Beat a friend challenge code | Silver | Rare fragment x10 |
| 95 | Share The Break | Share 10 end screens | Gold | 4 cores |
| 96 | Clutch Reel | Generate 25 highlight moments | Gold | Epic trail |
| 97 | Level 50 | Reach Account Level 50 | Gold | Legendary fragment x10 |
| 98 | Level 100 | Reach Account Level 100 | Platinum | Ascension unlock |
| 99 | First Ascension | Ascend once | Mythic | Mythic skin |
| 100 | Eternal Pulse | Ascend 10 times | Mythic | Final Mythic set |

## 13. Viral Mechanics

Pulsebreak should generate share-worthy moments automatically, then make sharing frictionless.

### 20 Viral-Worthy Moments

1. Triple near miss in under one second.
2. Boost activated one frame before crash.
3. Boss defeated after rewarded revive.
4. Stage 25 clear with less than 5 percent Pulse.
5. 30x combo chain.
6. 10 hazards destroyed in one Boost.
7. Rare shard collected through a hazard gap.
8. Perfect boss phase.
9. Daily Run personal best by under 100 points.
10. Friend Challenge Code beaten by under one second.
11. First Mythic drop from Lucky Spin.
12. No-Boost Stage 20 clear.
13. Ghost overtake in final boss phase.
14. Shard Fever full collection.
15. Chaos Event perfect clear.
16. Vanishing lane clutch.
17. Shield breaks and player survives boss.
18. New zone unlock screen.
19. Ascension animation.
20. Seasonal finale cosmetic unlock.

### Shareable End Screens

Every run result can create a share card:

- Score.
- Stage reached.
- Zone.
- Combo.
- Near misses.
- Shards.
- Cosmetic equipped.
- Highlight tag: "Clutch Save", "No Boost", "Perfect Boss", "Rare Drop".
- Friend Challenge Code.

Share card should be generated locally as an image. No server required.

## 14. Offline Social Systems

The game stays fully offline but still creates social pressure.

### Ghost Replay System

- Store the player's best run input stream per zone and daily seed.
- Replay ghost as a translucent trail.
- Store compressed input deltas, not video.
- Ghost file includes seed, version, zone, stage reached, and score.
- Older ghost files remain playable unless a major physics version changes.

### Personal Best Challenges

- Each zone has three personal ghost tracks: best score, deepest stage, cleanest run.
- The game suggests "Beat your Stage 14 ghost" from the menu.
- Beating a ghost grants a once-per-day reward.

### Friend Challenge Codes

Friend Challenge Codes encode:

- Game version.
- Zone.
- Seed.
- Stage start.
- Score target.
- Cosmetic display ID.
- Optional ghost checksum.

Example format:

`PBK-NEON-7F4A-014-24850-X9Q`

Players paste the code into the offline challenge screen. The game recreates the same run seed and target.

### No-Server Safety

- Codes should not claim global ranks.
- Codes should say "Friend Challenge", not "world leaderboard".
- Anti-cheat is not needed for offline fun, but challenge codes should include checksums to catch typos.

## 15. Cosmetic Catalog

Cosmetics are the main collection driver. They must be stylish, readable in motion, and never change hitboxes.

### 100 Unlockable Skins

| # | Skin | Rarity | Visual Theme | Unlock Method / Price |
|---:|---|---|---|---|
| 1 | Volt Runner | Common | Cyan starter pulse | Default |
| 2 | Carbon Basic | Common | Matte black with white core | 150 coins |
| 3 | Blue Static | Common | Electric blue noise | 180 coins |
| 4 | Cherry Byte | Common | Coral red pixel trim | 180 coins |
| 5 | Lime Wire | Common | Green circuit lines | 200 coins |
| 6 | Amber Dot | Common | Gold center light | 200 coins |
| 7 | Steel Flash | Common | Gray chrome edge | 220 coins |
| 8 | Pink Relay | Common | Pink signal glow | 220 coins |
| 9 | Ice Chip | Common | Frosted cyan facets | 240 coins |
| 10 | Street Glow | Common | Neon sign stripes | 240 coins |
| 11 | Blackout Lite | Common | Soft black shell | 260 coins |
| 12 | White Noise | Common | White shell with static | 260 coins |
| 13 | Signal Green | Common | Radio green waveform | 280 coins |
| 14 | Arcade Red | Common | Classic cabinet red | 280 coins |
| 15 | Sky Packet | Common | Light blue data trail | 300 coins |
| 16 | Hazard Yellow | Common | Warning stripe finish | 300 coins |
| 17 | Mint Sync | Common | Mint glow and pale core | 320 coins |
| 18 | Violet Ping | Common | Violet ping ring | 320 coins |
| 19 | Graphite | Common | Charcoal and silver | 340 coins |
| 20 | Sunrise | Common | Yellow-pink gradient | 340 coins |
| 21 | Nightline | Common | Navy body, cyan edge | 360 coins |
| 22 | Glass Blue | Common | Transparent blue shard | 360 coins |
| 23 | Coral Rush | Common | Coral core burst | 380 coins |
| 24 | Circuit Sand | Common | Tan board texture | 380 coins |
| 25 | Flatline | Common | White ECG line | 400 coins |
| 26 | Pulse Rookie | Common | Starter badge trim | Level 5 |
| 27 | Metro | Common | Subway sign motif | Neon City Stage 10 |
| 28 | Data Drop | Common | Falling data marks | 440 coins |
| 29 | Prism Low | Common | Small rainbow edge | 500 coins |
| 30 | Starter Gold | Common | Gold starter variant | Day 7 calendar |
| 31 | Crimson Trace | Rare | Red motion tracing | 800 coins |
| 32 | Ocean Split | Rare | Deep blue split body | 850 coins |
| 33 | Neon Taxi | Rare | Yellow city light blocks | 900 coins |
| 34 | After Hours | Rare | Dark club glow | 950 coins |
| 35 | Cyber Jade | Rare | Jade glass shell | 1,000 coins |
| 36 | Radiant Coil | Rare | Wrapped light coil | 1,050 coins |
| 37 | Sapphire Drive | Rare | Blue drive plate | 1,100 coins |
| 38 | Honey Grid | Rare | Gold hex grid | 1,150 coins |
| 39 | Radioactive | Rare | Green warning core | 1,200 coins |
| 40 | Ultraviolet | Rare | Purple UV glow | 1,250 coins |
| 41 | Solar Drift | Rare | Orange solar trim | 1,300 coins |
| 42 | Neon Graffiti | Rare | Street paint flashes | 1,350 coins |
| 43 | Plasma Wire | Rare | Hot pink plasma lines | 1,400 coins |
| 44 | Synthwave | Rare | Retro magenta-cyan | 1,450 coins |
| 45 | Pixel Melt | Rare | Melting pixel finish | 1,500 coins |
| 46 | Retro CRT | Rare | Scanline shell | 1,550 coins |
| 47 | Chrome Spark | Rare | Mirrored chrome | 1,600 coins |
| 48 | Toxic Mint | Rare | Mint hazard glow | 1,650 coins |
| 49 | Amber Circuit | Rare | Amber board lights | 1,700 coins |
| 50 | Holo Edge | Rare | Holographic outline | 1,750 coins |
| 51 | Street Racer | Rare | Asphalt decals | 1,800 coins |
| 52 | Deep Freeze | Rare | Blue-white frozen glow | 1,850 coins |
| 53 | Hot Swap | Rare | Red-blue split swap | 1,900 coins |
| 54 | Warning Tape | Rare | Black-yellow stripe | Weekly challenge |
| 55 | Arcade Champion | Rare | Trophy cabinet theme | Achievement 79 |
| 56 | Quantum Blade | Epic | Sharp reactor light | 3,000 coins + 10 fragments |
| 57 | Void Marker | Epic | Black body, violet mark | 3,200 coins + 10 fragments |
| 58 | Pulse Ronin | Epic | Minimal blade silhouette | 3,400 coins + 12 fragments |
| 59 | Nexus Crown | Epic | Crown-like light points | 3,600 coins + 12 fragments |
| 60 | Glitch Royal | Epic | Broken gold pixels | 3,800 coins + 14 fragments |
| 61 | Laser Bloom | Epic | Expanding laser petals | 4,000 coins + 14 fragments |
| 62 | Overclocked | Epic | Hot processor core | 4,200 coins + 16 fragments |
| 63 | Data Phantom | Epic | Translucent data body | 4,400 coins + 16 fragments |
| 64 | Prism Break | Epic | Bright prism split | 4,600 coins + 18 fragments |
| 65 | Ghostline | Epic | Pale afterimage finish | Beat 25 ghosts |
| 66 | Core White | Epic | White reactor shell | Quantum mastery |
| 67 | Signal Zero | Epic | Minimal black-white line | 4,800 coins + 18 fragments |
| 68 | Redshift | Epic | Gravity red gradient | Singularity Stage 10 |
| 69 | Blue Hour | Epic | Twilight blue glow | Daily Run 7-day goal |
| 70 | Neon Crown | Epic | City badge finish | Neon City mastery |
| 71 | Fractal | Epic | Recursive triangle pattern | 5,200 coins + 20 fragments |
| 72 | Circuit Glass | Epic | Transparent circuit body | 5,600 coins + 20 fragments |
| 73 | Pulse Idol | Epic | Stage light trim | Seasonal track |
| 74 | Memory Chip | Epic | Green board detail | 6,200 coins + 22 fragments |
| 75 | Rift Gold | Epic | Gold rift marks | 7,000 coins + 25 fragments |
| 76 | Singularity | Legendary | Gravity-lensed core | Singularity mastery |
| 77 | Nova King | Legendary | White-gold burst | 12,000 coins + 40 fragments |
| 78 | Metro Firewall | Legendary | Boss armor pattern | Defeat Metro Firewall 25 times |
| 79 | Circuit Tyrant | Legendary | Boss 2 armor glow | Defeat Circuit Tyrant 25 times |
| 80 | Void Sentinel | Legendary | Dark sentry crystal | Defeat Void Sentinel 25 times |
| 81 | Pulsebreaker | Legendary | Capstone boss finish | Clear Stage 25 |
| 82 | Calendar Gold | Legendary | 30-day calendar reward | Day 30 quest |
| 83 | Weekly Prime | Legendary | Weekly challenge badge | 12 weekly clears |
| 84 | Clean Slate | Legendary | White flawless finish | 7 perfect stages in one run |
| 85 | Chrome Crown | Legendary | Premium chrome-gold | 15,000 coins + 50 fragments |
| 86 | Glitch Monarch | Legendary | Broken royal pattern | Glitch mastery |
| 87 | Quantum Saint | Legendary | Bright reactor halo | Quantum mastery |
| 88 | Void Crown | Legendary | Violet crown outline | Void mastery |
| 89 | Nexus Prime | Legendary | Prismatic Nexus core | Pulse Nexus mastery |
| 90 | Season Finale | Legendary | Seasonal champion finish | Complete season |
| 91 | First Ascendant | Mythic | Ascension white flame | First Ascension |
| 92 | Eternal Pulse | Mythic | Animated pulse galaxy | Ascension 3 |
| 93 | Omega Circuit | Mythic | Gold-black living circuit | Ascension 5 |
| 94 | Mythic Prism | Mythic | Full-spectrum animated light | Mythic blueprint chain |
| 95 | Zero Point | Mythic | Black core, white event horizon | Singularity flawless boss |
| 96 | Nexus Eternal | Mythic | Prismatic endgame body | Pulse Nexus full mastery |
| 97 | Final Signal | Mythic | White signal with red core | Level 100 challenge |
| 98 | Crown Of Static | Mythic | Animated static crown | 100 achievements |
| 99 | Calendar Eternal | Mythic | 12 completed calendars | Long-term calendar quest |
| 100 | True Pulsebreak | Mythic | Final evolving skin | Ascension 10 |

### Additional Cosmetics

Trails:

- Common: Thin Line, Spark Dust, Data Thread, Ripple.
- Rare: Neon Ribbon, Scanline, Coin Burst, Shard Wake.
- Epic: Prism Trail, Glitch Tear, Gravity Arc, Overdrive Flame.
- Legendary: Boss Aura, Nexus Path, Perfect Clear Trail.
- Mythic: Ascension Wake, Eternal Pulse Trail.

Boost effects:

- Flash Ring.
- Shockwave.
- Split Beam.
- Pixel Break.
- Shard Nova.
- Gravity Snap.
- Firewall Burst.
- Whiteout.
- Mythic Ascension Break.

Menu themes:

- Neon City Rooftop.
- Quantum Reactor.
- Void Console.
- Glitch Arcade.
- Singularity Chamber.
- Pulse Nexus Gate.
- Seasonal Event Hub.

Sound packs:

- Classic Pulse.
- Synthwave.
- Minimal Click.
- Glitch Pop.
- Quantum Bass.
- Boss Heavy.
- Calm Focus.
- Prestige White Noise.

## 16. Audio Design

Audio should make the player feel locked in, not overwhelmed.

### Main Menu Music

Style: warm synth pads, clean bass, soft rhythmic pulse.  
Impact: creates calm anticipation and makes the game feel premium before play starts.

### Gameplay Music

Style: adaptive electronic loop with intensity layers.  
Impact: low intensity supports flow, high intensity raises heart rate as stages escalate.

### Boss Music

Style: heavier bass, clearer downbeat, short warning stingers.  
Impact: tells the player this is a skill test and improves pattern timing.

### Near Miss Sound

Style: tight stereo swipe with rising pitch.  
Impact: reinforces risk-taking and makes close calls addictive.

### Combo Sound

Style: short ascending tones every 5 combo levels.  
Impact: creates a small dopamine ladder and tells players they are performing well.

### Reward Sound

Style: bright chord plus coin shimmer.  
Impact: makes missions, cosmetics, and daily rewards feel valuable.

### Audio Rules

- No harsh frequencies during long play.
- Boss warnings must be audible even with music low.
- Near-miss sounds should never mask hazard telegraphs.
- Sound packs change flavor, not gameplay clarity.

## 17. Visual Art Direction

### Overall Look

Premium neon arcade with high contrast, restrained UI, and sharp effects. Avoid heavy 3D, giant textures, and expensive shaders. The game should run on low-end Android devices by relying on Canvas drawing, simple gradients, reusable particles, and small asset footprints.

### Color Palette

Core:

- Ink Black: `#07070c`
- Panel Black: `#11121a`
- Soft Line: `rgba(255,255,255,0.16)`
- Text White: `#f7f7fb`
- Muted Text: `#9da3b7`

Gameplay:

- Player Cyan: `#37f4ff`
- Pulse Mint: `#50f2a5`
- Reward Gold: `#ffd166`
- Hazard Coral: `#ff5a72`
- Elite Violet: `#a476ff`
- Boss Red: `#ff334d`

Zone accents:

- Neon City: cyan, coral, gold.
- Quantum Core: white, teal, gold.
- Void Network: black, violet, silver.
- Glitch Dimension: magenta, lime, blue.
- Singularity: black, red, orange, white.
- Pulse Nexus: white, prism accents, cyan.

### Lighting

- Player should always have the brightest local glow.
- Hazards use colored glow but never brighter than the player core.
- Rewards use gold/white and should be visible at speed.
- Boss attacks use larger telegraphs with clear warning color.

### Particle Effects

Particle budget:

- Low-end mode: 60 active particles.
- Default mode: 140 active particles.
- High-end mode: 240 active particles.

Particle categories:

- Shard pickup: 8-14 small gold particles.
- Boost activation: 40-70 radial particles.
- Hazard break: 12-24 fragments.
- Boss clear: layered rings, capped particle count.
- Ascension: special full-screen animation, not during gameplay.

### Screen Shake Rules

- Shard pickup: no shake.
- Near miss: 1-2 px micro shake only at high combo.
- Boost activation: 5-8 px for 0.1 sec.
- Hazard break: 3-5 px.
- Shield hit: 8-12 px.
- Crash: 14-18 px for 0.2 sec.
- Boss clear: 6-10 px pulse, not sustained.

Screen shake must be toggleable for accessibility.

### Animation Style

- Fast ease-out for UI confirmation.
- Smooth lane interpolation for player.
- Hazards use linear motion for readability.
- Boss telegraphs pulse twice before active danger.
- Cosmetic animation should be visible in menus but subtle in gameplay.

### UI Design System

- Dark translucent panels, 8 px radius.
- High-contrast buttons.
- Icons where possible, text for major actions.
- No nested cards.
- HUD must never cover the player or boss telegraphs.
- Results screen should prioritize score, stage, reward, and next action.
- Daily screen should fit reward, missions, and spin without feeling like a casino.

### Performance Guide

- Use procedural Canvas effects rather than large sprite sheets.
- Precompute hazard patterns.
- Avoid per-frame DOM layout changes.
- Keep all gameplay UI updates throttled where possible.
- Offer Reduced Effects mode.
- Cap particles based on frame time.
- Use static audio loops and small sound files.

## 18. Balancing Framework

### First Hour Experience

| Time | Player Experience | Design Goal |
|---|---|---|
| 0:00-0:30 | Opens game, sees premium menu, taps Play | No friction |
| 0:30-2:00 | First run, learns lanes and shards | Immediate comprehension |
| 2:00-3:00 | First crash, instant results, retry prompt | Failure feels fair |
| 3:00-5:00 | Second run reaches Stage 3-4 | Improvement is obvious |
| 5:00-7:00 | Level 2 unlocks Daily Missions | First meta hook |
| 7:00-10:00 | Completes first mission | Reward loop lands |
| 10:00-12:00 | Buys first Common cosmetic or upgrade | Ownership |
| 12:00-15:00 | Level 3 unlocks rewarded revive | Ad value introduced after trust |
| 15:00-20:00 | First mini boss | Stage structure appears |
| 20:00-25:00 | Skill tree opens | Long-term path |
| 25:00-30:00 | First Daily Run prompt | Daily habit |
| 30:00-40:00 | Near-miss and combo achievements | Skill expression |
| 40:00-50:00 | First boss attempt | Aspirational wall |
| 50:00-60:00 | Upgrade, retry, maybe boss clear | One more run |

### First Day

Expected:

- 12-25 runs.
- Account Level 5-9.
- 5-10 achievements.
- 2-5 cosmetics.
- First skill-tree upgrades.
- First rewarded revive may occur.
- Daily missions completed.

Goal:

- Player understands the game has more structure than a simple endless runner.
- Player sees next zone unlock within reach.

### First Week

Expected:

- Account Level 18-28 for engaged players.
- Quantum Core and Void Network unlocked.
- 25-40 achievements.
- 12-25 cosmetics.
- Several weekly challenges attempted.
- First zone mastery badge.

Goal:

- Player forms a daily routine.
- Player identifies a preferred zone, skin, and upgrade branch.

### First Month

Expected:

- Account Level 45-65.
- Four to six zones unlocked.
- 50-75 achievements.
- One Legendary cosmetic.
- One branch near completion.
- Seasonal event progress.

Goal:

- Player has invested identity in cosmetics and mastery.
- Player has deep-run goals and long-term achievement targets.

### Long-Term

Expected:

- Level 100 in 10-14 weeks for engaged players.
- First Ascension creates status reset.
- Mythic cosmetics become the long chase.
- Ghost and friend codes create repeatable personal goals.

## 19. App Store Optimization

### Positioning

Pulsebreak should be positioned as a premium-feeling offline neon arcade reflex game, not a generic endless runner.

### App Name

Pulsebreak

### Subtitle

Offline Neon Arcade Run

### Short Description

Dodge, boost, and survive escalating neon stages in a fast offline arcade runner built for clutch moments and one-more-run mastery.

### Full Game Description

Pulsebreak is a fast offline arcade runner where every second gets sharper. Slide through neon lanes, grab shards, build combo, and fire your Pulse Boost to break through impossible patterns.

Master escalating stages, defeat bosses, unlock stylish skins, chase daily runs, and beat your own ghost replays. No internet is required for core gameplay.

Features:

- Fast one-thumb arcade survival.
- Offline play.
- Escalating stages, chaos events, and bosses.
- Daily missions and Daily Run seeds.
- Permanent skill-tree progression.
- 100 collectible skins plus trails, boost effects, themes, and sound packs.
- Ghost replays and shareable challenge codes.
- Rewarded ads only. No forced ads and no energy system.

### Keywords

arcade,offline,runner,neon,dodge,reflex,boost,combo,casual,challenge,ghost,daily,skins,cyber

### Screenshot Concepts

1. "Dodge The Neon Break" - player weaving through hazards.
2. "Boost Through Chaos" - boost shattering blockers.
3. "Boss Stages Await" - boss telegraph and stage label.
4. "Unlock 100 Skins" - cosmetic grid.
5. "Daily Runs And Missions" - daily screen and rewards.
6. "Challenge Your Ghost" - ghost replay overlay.
7. "Play Offline Anywhere" - clean offline message.

### Trailer Concept: 25 Seconds

- 0-3 sec: instant menu to gameplay.
- 3-8 sec: lane dodging and shard pickups.
- 8-12 sec: near misses and combo climb.
- 12-16 sec: Boost destroys hazard chain.
- 16-20 sec: boss pattern and clutch survival.
- 20-23 sec: cosmetics, daily missions, ghost challenge.
- 23-25 sec: logo and "Play Offline".

### Launch Strategy

Soft launch:

- Release to a limited region or TestFlight group.
- Measure tutorial-free comprehension.
- Tune first 10 runs, ad opt-in, crash fairness, and first-day retention.
- Add device performance logging if native wrapper supports it.

Prelaunch assets:

- 6 App Store screenshots.
- 1 short preview video.
- Privacy policy.
- App Review notes explaining offline gameplay and rewarded-only ads.
- Age rating aligned with ad network content settings.

Launch week:

- Push short gameplay clips built around clutch moments.
- Encourage sharing Friend Challenge Codes.
- Promote "offline, no forced ads" clearly.
- Run creator outreach with challenge seeds.

Post-launch:

- Weekly seed challenge posted on social platforms.
- Monthly cosmetic event.
- App Store product page tests for subtitle, screenshots, and trailer order.
- Custom product pages for "offline arcade", "neon reflex", and "no forced ads" audiences.

### Growth Strategy

Organic hooks:

- Shareable end cards.
- Friend Challenge Codes.
- Daily seed clips.
- Rare event unlock posts.
- Ghost rematch clips.

Paid user acquisition tests:

- 6-second boost clip.
- Boss clutch clip.
- Cosmetic unlock clip.
- "No Wi-Fi needed" clip.
- "Can you beat this code?" challenge clip.

Creative testing should optimize for Day 1 retention and cost per retained player, not just install cost.

### App Store Notes And Sources

Use current App Store Connect and ad-network guidance before release:

- Apple App Privacy Details: https://developer.apple.com/app-store/app-privacy-details/
- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Apple Product Page Optimization: https://developer.apple.com/help/app-store-connect/test-a-product-page-optimization
- Apple Custom Product Pages: https://developer.apple.com/help/app-store-connect/create-custom-product-pages
- Google AdMob iOS Privacy and UMP: https://developers.google.com/admob/ios/privacy

## 20. Implementation Roadmap

### Phase 1: Core Redesign

- Add stage manager.
- Add stage labels and reward checkpoints.
- Add boss patterns.
- Remove all forced ads.
- Add rewarded double rewards.
- Add Daily Run seed and ghost storage.

### Phase 2: Progression

- Add account XP and level table.
- Add resource wallet.
- Add skill tree.
- Add cosmetic shop with rarity sorting.
- Add achievement tracker.

### Phase 3: Retention

- Add 30-day calendar.
- Add daily missions and weekly challenges.
- Add streak bonuses.
- Add Lucky Spin with transparent odds.
- Add shareable end screens.

### Phase 4: Content

- Add zones.
- Add 100 skins.
- Add trails, boost effects, themes, and sound packs.
- Add seasonal event framework.
- Add Ascension prestige.

### Phase 5: Launch Polish

- Generate App Store icon sizes.
- Build native iOS wrapper.
- Integrate AdMob rewarded ads and consent flow.
- Add privacy policy.
- Test performance on low-end Android and older iPhones.
- Create screenshots and trailer.

## 21. Final Design Summary

Pulsebreak should become a premium offline reflex game with a clear structure:

- Runs escalate through named stages and bosses.
- Progression gives players meaningful goals every session.
- Cosmetics create identity and long-term collection.
- Daily and weekly systems bring players back without punishment.
- Ghosts and challenge codes create offline social competition.
- Rewarded ads support the business while respecting the player.

The strongest version of Pulsebreak is not the most aggressive monetization version. It is the version players trust, replay, share, and keep installed.
