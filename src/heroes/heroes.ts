export type Hero = {
  id: number;
  name: string;
  /** Internal name without "npc_dota_hero_"; used for portrait URLs. */
  key: string;
};

/** Static id → name table. Incomplete names still validate by id. */
export const HEROES: Hero[] = [
  { id: 1, name: "Anti-Mage", key: "antimage" },
  { id: 2, name: "Axe", key: "axe" },
  { id: 3, name: "Bane", key: "bane" },
  { id: 4, name: "Bloodseeker", key: "bloodseeker" },
  { id: 5, name: "Crystal Maiden", key: "crystal_maiden" },
  { id: 6, name: "Drow Ranger", key: "drow_ranger" },
  { id: 7, name: "Earthshaker", key: "earthshaker" },
  { id: 8, name: "Juggernaut", key: "juggernaut" },
  { id: 9, name: "Mirana", key: "mirana" },
  { id: 10, name: "Morphling", key: "morphling" },
  { id: 11, name: "Shadow Fiend", key: "nevermore" },
  { id: 12, name: "Phantom Lancer", key: "phantom_lancer" },
  { id: 13, name: "Puck", key: "puck" },
  { id: 14, name: "Pudge", key: "pudge" },
  { id: 15, name: "Razor", key: "razor" },
  { id: 16, name: "Sand King", key: "sand_king" },
  { id: 17, name: "Storm Spirit", key: "storm_spirit" },
  { id: 18, name: "Sven", key: "sven" },
  { id: 19, name: "Tiny", key: "tiny" },
  { id: 20, name: "Vengeful Spirit", key: "vengefulspirit" },
  { id: 21, name: "Windranger", key: "windrunner" },
  { id: 22, name: "Zeus", key: "zuus" },
  { id: 23, name: "Kunkka", key: "kunkka" },
  { id: 25, name: "Lina", key: "lina" },
  { id: 26, name: "Lion", key: "lion" },
  { id: 27, name: "Shadow Shaman", key: "shadow_shaman" },
  { id: 28, name: "Slardar", key: "slardar" },
  { id: 29, name: "Tidehunter", key: "tidehunter" },
  { id: 30, name: "Witch Doctor", key: "witch_doctor" },
  { id: 31, name: "Lich", key: "lich" },
  { id: 32, name: "Riki", key: "riki" },
  { id: 33, name: "Enigma", key: "enigma" },
  { id: 34, name: "Tinker", key: "tinker" },
  { id: 35, name: "Sniper", key: "sniper" },
  { id: 36, name: "Necrophos", key: "necrolyte" },
  { id: 37, name: "Warlock", key: "warlock" },
  { id: 38, name: "Beastmaster", key: "beastmaster" },
  { id: 39, name: "Queen of Pain", key: "queenofpain" },
  { id: 40, name: "Venomancer", key: "venomancer" },
  { id: 41, name: "Faceless Void", key: "faceless_void" },
  { id: 42, name: "Wraith King", key: "skeleton_king" },
  { id: 43, name: "Death Prophet", key: "death_prophet" },
  { id: 44, name: "Phantom Assassin", key: "phantom_assassin" },
  { id: 45, name: "Pugna", key: "pugna" },
  { id: 46, name: "Templar Assassin", key: "templar_assassin" },
  { id: 47, name: "Viper", key: "viper" },
  { id: 48, name: "Luna", key: "luna" },
  { id: 49, name: "Dragon Knight", key: "dragon_knight" },
  { id: 50, name: "Dazzle", key: "dazzle" },
  { id: 51, name: "Clockwerk", key: "rattletrap" },
  { id: 52, name: "Leshrac", key: "leshrac" },
  { id: 53, name: "Nature's Prophet", key: "furion" },
  { id: 54, name: "Lifestealer", key: "life_stealer" },
  { id: 55, name: "Dark Seer", key: "dark_seer" },
  { id: 56, name: "Clinkz", key: "clinkz" },
  { id: 57, name: "Omniknight", key: "omniknight" },
  { id: 58, name: "Enchantress", key: "enchantress" },
  { id: 59, name: "Huskar", key: "huskar" },
  { id: 60, name: "Night Stalker", key: "night_stalker" },
  { id: 61, name: "Broodmother", key: "broodmother" },
  { id: 62, name: "Bounty Hunter", key: "bounty_hunter" },
  { id: 63, name: "Weaver", key: "weaver" },
  { id: 64, name: "Jakiro", key: "jakiro" },
  { id: 65, name: "Batrider", key: "batrider" },
  { id: 66, name: "Chen", key: "chen" },
  { id: 67, name: "Spectre", key: "spectre" },
  { id: 68, name: "Ancient Apparition", key: "ancient_apparition" },
  { id: 69, name: "Doom", key: "doom_bringer" },
  { id: 70, name: "Ursa", key: "ursa" },
  { id: 71, name: "Spirit Breaker", key: "spirit_breaker" },
  { id: 72, name: "Gyrocopter", key: "gyrocopter" },
  { id: 73, name: "Alchemist", key: "alchemist" },
  { id: 74, name: "Invoker", key: "invoker" },
  { id: 75, name: "Silencer", key: "silencer" },
  { id: 76, name: "Outworld Destroyer", key: "obsidian_destroyer" },
  { id: 77, name: "Lycan", key: "lycan" },
  { id: 78, name: "Brewmaster", key: "brewmaster" },
  { id: 79, name: "Shadow Demon", key: "shadow_demon" },
  { id: 80, name: "Lone Druid", key: "lone_druid" },
  { id: 81, name: "Chaos Knight", key: "chaos_knight" },
  { id: 82, name: "Meepo", key: "meepo" },
  { id: 83, name: "Treant Protector", key: "treant" },
  { id: 84, name: "Ogre Magi", key: "ogre_magi" },
  { id: 85, name: "Undying", key: "undying" },
  { id: 86, name: "Rubick", key: "rubick" },
  { id: 87, name: "Disruptor", key: "disruptor" },
  { id: 88, name: "Nyx Assassin", key: "nyx_assassin" },
  { id: 89, name: "Naga Siren", key: "naga_siren" },
  { id: 90, name: "Keeper of the Light", key: "keeper_of_the_light" },
  { id: 91, name: "Io", key: "wisp" },
  { id: 92, name: "Visage", key: "visage" },
  { id: 93, name: "Slark", key: "slark" },
  { id: 94, name: "Medusa", key: "medusa" },
  { id: 95, name: "Troll Warlord", key: "troll_warlord" },
  { id: 96, name: "Centaur Warrunner", key: "centaur" },
  { id: 97, name: "Magnus", key: "magnataur" },
  { id: 98, name: "Timbersaw", key: "shredder" },
  { id: 99, name: "Bristleback", key: "bristleback" },
  { id: 100, name: "Tusk", key: "tusk" },
  { id: 101, name: "Skywrath Mage", key: "skywrath_mage" },
  { id: 102, name: "Abaddon", key: "abaddon" },
  { id: 103, name: "Elder Titan", key: "elder_titan" },
  { id: 104, name: "Legion Commander", key: "legion_commander" },
  { id: 105, name: "Techies", key: "techies" },
  { id: 106, name: "Ember Spirit", key: "ember_spirit" },
  { id: 107, name: "Earth Spirit", key: "earth_spirit" },
  { id: 108, name: "Underlord", key: "abyssal_underlord" },
  { id: 109, name: "Terrorblade", key: "terrorblade" },
  { id: 110, name: "Phoenix", key: "phoenix" },
  { id: 111, name: "Oracle", key: "oracle" },
  { id: 112, name: "Winter Wyvern", key: "winter_wyvern" },
  { id: 113, name: "Arc Warden", key: "arc_warden" },
  { id: 114, name: "Monkey King", key: "monkey_king" },
  { id: 119, name: "Dark Willow", key: "dark_willow" },
  { id: 120, name: "Pangolier", key: "pangolier" },
  { id: 121, name: "Grimstroke", key: "grimstroke" },
  { id: 123, name: "Hoodwink", key: "hoodwink" },
  { id: 126, name: "Void Spirit", key: "void_spirit" },
  { id: 128, name: "Snapfire", key: "snapfire" },
  { id: 129, name: "Mars", key: "mars" },
  { id: 131, name: "Ringmaster", key: "ringmaster" },
  { id: 135, name: "Dawnbreaker", key: "dawnbreaker" },
  { id: 136, name: "Marci", key: "marci" },
  { id: 137, name: "Primal Beast", key: "primal_beast" },
  { id: 138, name: "Muerta", key: "muerta" },
  { id: 145, name: "Kez", key: "kez" },
  { id: 155, name: "Largo", key: "largo" },
];

export const HERO_BY_ID = new Map(HEROES.map((h) => [h.id, h]));

const PORTRAIT_BASE = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/";
/** Classic vertical card art, already framed like the in-game portrait. */
const CARD_PORTRAIT_BASE = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/heroes/";

export function heroPortraitUrl(hero: Hero): string {
  return `${PORTRAIT_BASE}${hero.key}.png`;
}

export function heroCardPortraitUrl(hero: Hero): string {
  return `${CARD_PORTRAIT_BASE}${hero.key}_vert.jpg`;
}

export function unusedHeroCount(assigned: number[], rosterSize: number): number {
  const unique = new Set(assigned);
  return Math.max(0, rosterSize - unique.size);
}

export function unusedHeroes(assigned: Iterable<number>): Hero[] {
  const used = new Set(assigned);
  return HEROES.filter((h) => !used.has(h.id));
}
