/**
 * The administrative tier an area manager oversees. Each level implies all
 * of the higher-level columns are also fixed on the manager's row:
 *   province  -> province
 *   region    -> province + region
 *   district  -> province + region + district
 *   tehsil    -> province + region + district + tehsil
 * Stored as a plain varchar (not a DB enum) so no extra enum migration is
 * needed and new tiers can be added without an ALTER TYPE.
 */
export enum AreaLevel {
  PROVINCE = 'province',
  REGION = 'region',
  DISTRICT = 'district',
  TEHSIL = 'tehsil',
}

export const AREA_LEVELS: AreaLevel[] = [
  AreaLevel.PROVINCE,
  AreaLevel.REGION,
  AreaLevel.DISTRICT,
  AreaLevel.TEHSIL,
];

/** The geo columns that must be set for a manager at the given level. */
export function requiredAreaColumns(level: AreaLevel): Array<
  'province' | 'region' | 'district' | 'tehsil'
> {
  switch (level) {
    case AreaLevel.PROVINCE:
      return ['province'];
    case AreaLevel.REGION:
      return ['province', 'region'];
    case AreaLevel.DISTRICT:
      return ['province', 'region', 'district'];
    case AreaLevel.TEHSIL:
      return ['province', 'region', 'district', 'tehsil'];
    default:
      return ['province'];
  }
}

/** The tier immediately below `level`, or null if `level` is the lowest. */
export function childLevel(level: AreaLevel): AreaLevel | null {
  switch (level) {
    case AreaLevel.PROVINCE:
      return AreaLevel.REGION;
    case AreaLevel.REGION:
      return AreaLevel.DISTRICT;
    case AreaLevel.DISTRICT:
      return AreaLevel.TEHSIL;
    case AreaLevel.TEHSIL:
      return null;
    default:
      return null;
  }
}
