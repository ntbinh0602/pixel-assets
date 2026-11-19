// Generated from docs/game-design/balance-draft.json by scripts/build-content.mjs.
export const CONTENT = {
  "version": "sprint-3.1",
  "saveVersion": 1,
  "releaseLevelCap": 5,
  "designLevelCap": 50,
  "classes": [
    {
      "id": "warrior",
      "name": {
        "vi": "Chiến binh",
        "en": "Warrior"
      },
      "weapon": {
        "vi": "Kiếm",
        "en": "Sword"
      },
      "offhand": {
        "vi": "Khiên",
        "en": "Shield"
      },
      "damageType": "physical",
      "base": {
        "hp": 160,
        "mp": 60,
        "power": 12,
        "armor": 8,
        "speed": 70
      },
      "perLevel": {
        "hp": 14,
        "mp": 3,
        "power": 2,
        "armor": 0.8
      },
      "armorMultiplier": 1,
      "gearHpMultiplier": 1
    },
    {
      "id": "mage",
      "name": {
        "vi": "Pháp sư",
        "en": "Mage"
      },
      "weapon": {
        "vi": "Trượng",
        "en": "Staff"
      },
      "offhand": {
        "vi": "Pháp thư",
        "en": "Spellbook"
      },
      "damageType": "magic",
      "base": {
        "hp": 105,
        "mp": 140,
        "power": 14,
        "armor": 3,
        "speed": 68
      },
      "perLevel": {
        "hp": 9,
        "mp": 8,
        "power": 2,
        "armor": 0.45
      },
      "armorMultiplier": 0.6,
      "gearHpMultiplier": 0.75
    },
    {
      "id": "archer",
      "name": {
        "vi": "Cung thủ",
        "en": "Archer"
      },
      "weapon": {
        "vi": "Cung",
        "en": "Bow"
      },
      "offhand": {
        "vi": "Ống tên",
        "en": "Quiver"
      },
      "damageType": "physical",
      "base": {
        "hp": 125,
        "mp": 90,
        "power": 12,
        "armor": 5,
        "speed": 78
      },
      "perLevel": {
        "hp": 11,
        "mp": 5,
        "power": 2,
        "armor": 0.6
      },
      "armorMultiplier": 0.8,
      "gearHpMultiplier": 0.9
    }
  ],
  "skills": [
    {
      "id": "warrior.sweeping-slash",
      "classId": "warrior",
      "name": {
        "vi": "Trảm Kích",
        "en": "Sweeping Slash"
      },
      "minLevel": 1,
      "kind": "active",
      "maxRank": 5,
      "rankLevelGates": [
        1,
        6,
        11,
        16,
        21
      ],
      "basePowerCoefficient": 1.5,
      "baseMana": 6,
      "baseCooldownSeconds": 3,
      "fxIds": [
        "melee/sword-slash",
        "impacts/hit-spark"
      ],
      "damageModel": "per-target-per-cast"
    },
    {
      "id": "warrior.shield-bash",
      "classId": "warrior",
      "name": {
        "vi": "Khiên Kích",
        "en": "Shield Bash"
      },
      "minLevel": 5,
      "kind": "active",
      "maxRank": 5,
      "rankLevelGates": [
        5,
        10,
        15,
        20,
        25
      ],
      "basePowerCoefficient": 1.1,
      "baseMana": 10,
      "baseCooldownSeconds": 7,
      "fxIds": [
        "impacts/shield-block",
        "impacts/blunt-hit"
      ],
      "damageModel": "per-target-per-cast"
    },
    {
      "id": "mage.fireball",
      "classId": "mage",
      "name": {
        "vi": "Hỏa Cầu",
        "en": "Fireball"
      },
      "minLevel": 1,
      "kind": "active",
      "maxRank": 5,
      "rankLevelGates": [
        1,
        6,
        11,
        16,
        21
      ],
      "basePowerCoefficient": 1.8,
      "baseMana": 10,
      "baseCooldownSeconds": 3,
      "fxIds": [
        "fire/fireball",
        "explosions/small-explosion"
      ],
      "damageModel": "per-target-per-cast"
    },
    {
      "id": "mage.frost-nova",
      "classId": "mage",
      "name": {
        "vi": "Băng Hoàn",
        "en": "Frost Nova"
      },
      "minLevel": 5,
      "kind": "active",
      "maxRank": 5,
      "rankLevelGates": [
        5,
        10,
        15,
        20,
        25
      ],
      "basePowerCoefficient": 1.2,
      "baseMana": 16,
      "baseCooldownSeconds": 8,
      "fxIds": [
        "ice/frost-nova",
        "status/slowed"
      ],
      "damageModel": "per-target-per-cast"
    },
    {
      "id": "archer.piercing-arrow",
      "classId": "archer",
      "name": {
        "vi": "Xuyên Tiễn",
        "en": "Piercing Arrow"
      },
      "minLevel": 1,
      "kind": "active",
      "maxRank": 5,
      "rankLevelGates": [
        1,
        6,
        11,
        16,
        21
      ],
      "basePowerCoefficient": 1.6,
      "baseMana": 6,
      "baseCooldownSeconds": 3,
      "fxIds": [
        "projectiles/arrow",
        "impacts/hit-spark"
      ],
      "damageModel": "per-target-per-cast",
      "maxTargets": 2,
      "maxHitsPerTarget": 1
    },
    {
      "id": "archer.fan-arrows",
      "classId": "archer",
      "name": {
        "vi": "Tản Tiễn",
        "en": "Fan of Arrows"
      },
      "minLevel": 5,
      "kind": "active",
      "maxRank": 5,
      "rankLevelGates": [
        5,
        10,
        15,
        20,
        25
      ],
      "basePowerCoefficient": 0.65,
      "baseMana": 12,
      "baseCooldownSeconds": 6,
      "fxIds": [
        "projectiles/arrow"
      ],
      "damageModel": "per-projectile",
      "baseProjectileCount": 3,
      "baseTotalCoefficient": 1.95,
      "maxProjectilesPerTarget": 1,
      "projectileCountsByRank": [
        3,
        3,
        4,
        4,
        5
      ]
    }
  ],
  "tier": {
    "tier": 1,
    "minLevel": 1,
    "maxLevel": 5,
    "setName": {
      "vi": "Tân Binh",
      "en": "Novice"
    },
    "weaponPower": 4,
    "fullArmorBudget": 10,
    "fullGearHpBudget": 20,
    "maxRarity": "common",
    "items": {
      "warrior": {
        "weapon": {
          "vi": "Kiếm Tân Binh",
          "en": "Novice Sword"
        },
        "offhand": {
          "vi": "Khiên Tân Binh",
          "en": "Novice Shield"
        }
      },
      "mage": {
        "weapon": {
          "vi": "Trượng Tân Binh",
          "en": "Novice Staff"
        },
        "offhand": {
          "vi": "Pháp thư Tân Binh",
          "en": "Novice Spellbook"
        }
      },
      "archer": {
        "weapon": {
          "vi": "Cung Tân Binh",
          "en": "Novice Bow"
        },
        "offhand": {
          "vi": "Ống tên Tân Binh",
          "en": "Novice Quiver"
        }
      }
    }
  },
  "allSkills": [
    {
      "id": "warrior.sweeping-slash",
      "classId": "warrior",
      "name": {
        "vi": "Trảm Kích",
        "en": "Sweeping Slash"
      },
      "minLevel": 1,
      "kind": "active",
      "maxRank": 5,
      "rankLevelGates": [
        1,
        6,
        11,
        16,
        21
      ],
      "basePowerCoefficient": 1.5,
      "baseMana": 6,
      "baseCooldownSeconds": 3,
      "fxIds": [
        "melee/sword-slash",
        "impacts/hit-spark"
      ],
      "damageModel": "per-target-per-cast"
    },
    {
      "id": "warrior.shield-bash",
      "classId": "warrior",
      "name": {
        "vi": "Khiên Kích",
        "en": "Shield Bash"
      },
      "minLevel": 5,
      "kind": "active",
      "maxRank": 5,
      "rankLevelGates": [
        5,
        10,
        15,
        20,
        25
      ],
      "basePowerCoefficient": 1.1,
      "baseMana": 10,
      "baseCooldownSeconds": 7,
      "fxIds": [
        "impacts/shield-block",
        "impacts/blunt-hit"
      ],
      "damageModel": "per-target-per-cast"
    },
    {
      "id": "warrior.dash-strike",
      "classId": "warrior",
      "name": {
        "vi": "Xung Phong",
        "en": "Dash Strike"
      },
      "minLevel": 10,
      "kind": "active",
      "maxRank": 5,
      "rankLevelGates": [
        10,
        15,
        20,
        25,
        30
      ],
      "basePowerCoefficient": 1.8,
      "baseMana": 12,
      "baseCooldownSeconds": 8,
      "fxIds": [
        "melee/heavy-cleave",
        "impacts/crit-hit"
      ],
      "damageModel": "per-target-per-cast"
    },
    {
      "id": "warrior.iron-will",
      "classId": "warrior",
      "name": {
        "vi": "Ý Chí Sắt",
        "en": "Iron Will"
      },
      "minLevel": 15,
      "kind": "passive",
      "maxRank": 5,
      "rankLevelGates": [
        15,
        20,
        25,
        30,
        35
      ],
      "basePowerCoefficient": null,
      "baseMana": 0,
      "baseCooldownSeconds": 0,
      "fxIds": [
        "holy/divine-shield"
      ],
      "damageModel": "none",
      "passivePerRank": {
        "damageReduction": 0.02
      }
    },
    {
      "id": "warrior.earth-stomp",
      "classId": "warrior",
      "name": {
        "vi": "Địa Chấn",
        "en": "Earth Stomp"
      },
      "minLevel": 20,
      "kind": "active",
      "maxRank": 5,
      "rankLevelGates": [
        20,
        25,
        30,
        35,
        40
      ],
      "basePowerCoefficient": 2.2,
      "baseMana": 18,
      "baseCooldownSeconds": 12,
      "fxIds": [
        "impacts/ground-slam",
        "nature/earth-spike"
      ],
      "damageModel": "per-target-per-cast"
    },
    {
      "id": "warrior.blade-tempest",
      "classId": "warrior",
      "name": {
        "vi": "Bão Kiếm",
        "en": "Blade Tempest"
      },
      "minLevel": 30,
      "kind": "ultimate",
      "maxRank": 5,
      "rankLevelGates": [
        30,
        35,
        40,
        45,
        50
      ],
      "basePowerCoefficient": 4.5,
      "baseMana": 30,
      "baseCooldownSeconds": 30,
      "fxIds": [
        "melee/spin-slash",
        "melee/double-slash"
      ],
      "damageModel": "per-target-per-cast",
      "maxHitsPerTarget": 6,
      "damageDurationSeconds": 1.2
    },
    {
      "id": "mage.fireball",
      "classId": "mage",
      "name": {
        "vi": "Hỏa Cầu",
        "en": "Fireball"
      },
      "minLevel": 1,
      "kind": "active",
      "maxRank": 5,
      "rankLevelGates": [
        1,
        6,
        11,
        16,
        21
      ],
      "basePowerCoefficient": 1.8,
      "baseMana": 10,
      "baseCooldownSeconds": 3,
      "fxIds": [
        "fire/fireball",
        "explosions/small-explosion"
      ],
      "damageModel": "per-target-per-cast"
    },
    {
      "id": "mage.frost-nova",
      "classId": "mage",
      "name": {
        "vi": "Băng Hoàn",
        "en": "Frost Nova"
      },
      "minLevel": 5,
      "kind": "active",
      "maxRank": 5,
      "rankLevelGates": [
        5,
        10,
        15,
        20,
        25
      ],
      "basePowerCoefficient": 1.2,
      "baseMana": 16,
      "baseCooldownSeconds": 8,
      "fxIds": [
        "ice/frost-nova",
        "status/slowed"
      ],
      "damageModel": "per-target-per-cast"
    },
    {
      "id": "mage.blink",
      "classId": "mage",
      "name": {
        "vi": "Dịch Chuyển",
        "en": "Blink"
      },
      "minLevel": 10,
      "kind": "active",
      "maxRank": 5,
      "rankLevelGates": [
        10,
        15,
        20,
        25,
        30
      ],
      "basePowerCoefficient": null,
      "baseMana": 14,
      "baseCooldownSeconds": 9,
      "fxIds": [
        "arcane/blink-out",
        "arcane/blink-in"
      ],
      "damageModel": "none",
      "manaScalesWithRank": false
    },
    {
      "id": "mage.arcane-mind",
      "classId": "mage",
      "name": {
        "vi": "Tâm Trí Huyền Thuật",
        "en": "Arcane Mind"
      },
      "minLevel": 15,
      "kind": "passive",
      "maxRank": 5,
      "rankLevelGates": [
        15,
        20,
        25,
        30,
        35
      ],
      "basePowerCoefficient": null,
      "baseMana": 0,
      "baseCooldownSeconds": 0,
      "fxIds": [
        "arcane/mana-burst"
      ],
      "damageModel": "none",
      "passivePerRank": {
        "maxMpIncrease": 0.04
      }
    },
    {
      "id": "mage.chain-lightning",
      "classId": "mage",
      "name": {
        "vi": "Liên Hoàn Lôi",
        "en": "Chain Lightning"
      },
      "minLevel": 20,
      "kind": "active",
      "maxRank": 5,
      "rankLevelGates": [
        20,
        25,
        30,
        35,
        40
      ],
      "basePowerCoefficient": 2.4,
      "baseMana": 24,
      "baseCooldownSeconds": 10,
      "fxIds": [
        "lightning/chain-lightning",
        "lightning/zap-hit"
      ],
      "damageModel": "shared-cast-budget",
      "maxTargetsByRank": [
        3,
        3,
        4,
        4,
        5
      ]
    },
    {
      "id": "mage.meteor",
      "classId": "mage",
      "name": {
        "vi": "Thiên Thạch",
        "en": "Meteor"
      },
      "minLevel": 30,
      "kind": "ultimate",
      "maxRank": 5,
      "rankLevelGates": [
        30,
        35,
        40,
        45,
        50
      ],
      "basePowerCoefficient": 5,
      "baseMana": 40,
      "baseCooldownSeconds": 30,
      "fxIds": [
        "fire/meteor",
        "explosions/big-explosion"
      ],
      "damageModel": "per-target-per-cast"
    },
    {
      "id": "archer.piercing-arrow",
      "classId": "archer",
      "name": {
        "vi": "Xuyên Tiễn",
        "en": "Piercing Arrow"
      },
      "minLevel": 1,
      "kind": "active",
      "maxRank": 5,
      "rankLevelGates": [
        1,
        6,
        11,
        16,
        21
      ],
      "basePowerCoefficient": 1.6,
      "baseMana": 6,
      "baseCooldownSeconds": 3,
      "fxIds": [
        "projectiles/arrow",
        "impacts/hit-spark"
      ],
      "damageModel": "per-target-per-cast",
      "maxTargets": 2,
      "maxHitsPerTarget": 1
    },
    {
      "id": "archer.fan-arrows",
      "classId": "archer",
      "name": {
        "vi": "Tản Tiễn",
        "en": "Fan of Arrows"
      },
      "minLevel": 5,
      "kind": "active",
      "maxRank": 5,
      "rankLevelGates": [
        5,
        10,
        15,
        20,
        25
      ],
      "basePowerCoefficient": 0.65,
      "baseMana": 12,
      "baseCooldownSeconds": 6,
      "fxIds": [
        "projectiles/arrow"
      ],
      "damageModel": "per-projectile",
      "baseProjectileCount": 3,
      "baseTotalCoefficient": 1.95,
      "maxProjectilesPerTarget": 1,
      "projectileCountsByRank": [
        3,
        3,
        4,
        4,
        5
      ]
    },
    {
      "id": "archer.evasive-step",
      "classId": "archer",
      "name": {
        "vi": "Bước Né",
        "en": "Evasive Step"
      },
      "minLevel": 10,
      "kind": "active",
      "maxRank": 5,
      "rankLevelGates": [
        10,
        15,
        20,
        25,
        30
      ],
      "basePowerCoefficient": null,
      "baseMana": 10,
      "baseCooldownSeconds": 8,
      "fxIds": [
        "spawn/poof",
        "status/haste"
      ],
      "damageModel": "none",
      "manaScalesWithRank": false
    },
    {
      "id": "archer.eagle-eye",
      "classId": "archer",
      "name": {
        "vi": "Mắt Đại Bàng",
        "en": "Eagle Eye"
      },
      "minLevel": 15,
      "kind": "passive",
      "maxRank": 5,
      "rankLevelGates": [
        15,
        20,
        25,
        30,
        35
      ],
      "basePowerCoefficient": null,
      "baseMana": 0,
      "baseCooldownSeconds": 0,
      "fxIds": [
        "ui/crit-number"
      ],
      "damageModel": "none",
      "passivePerRank": {
        "critChanceIncrease": 0.02
      }
    },
    {
      "id": "archer.venom-arrow",
      "classId": "archer",
      "name": {
        "vi": "Độc Tiễn",
        "en": "Venom Arrow"
      },
      "minLevel": 20,
      "kind": "active",
      "maxRank": 5,
      "rankLevelGates": [
        20,
        25,
        30,
        35,
        40
      ],
      "basePowerCoefficient": 1.4,
      "baseMana": 14,
      "baseCooldownSeconds": 9,
      "fxIds": [
        "projectiles/arrow",
        "nature/poison-cloud",
        "status/poisoned"
      ],
      "damageModel": "per-target-per-cast",
      "dotTotalCoefficient": 0.6,
      "dotDurationSeconds": 3,
      "dotStacking": "refresh-only",
      "dotDamageType": "poison"
    },
    {
      "id": "archer.arrow-storm",
      "classId": "archer",
      "name": {
        "vi": "Mưa Tên",
        "en": "Arrow Storm"
      },
      "minLevel": 30,
      "kind": "ultimate",
      "maxRank": 5,
      "rankLevelGates": [
        30,
        35,
        40,
        45,
        50
      ],
      "basePowerCoefficient": 4.8,
      "baseMana": 28,
      "baseCooldownSeconds": 30,
      "fxIds": [
        "projectiles/arrow",
        "impacts/bullet-impact"
      ],
      "damageModel": "per-target-per-cast",
      "maxHitsPerTarget": 4,
      "damageDurationSeconds": 2
    }
  ]
};
