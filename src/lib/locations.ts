import raw from "@/data/turkey-locations.json";

type RawEntry = {
  province: string;
  districts: { id: number; name: string }[];
};

export type LocationProvince = {
  province: string;
  districts: string[];
};

const CYPRUS_LOCATIONS: LocationProvince[] = [
  {
    province: "Kıbrıs — Lefkoşa",
    districts: ["Lefkoşa", "Gönyeli", "Değirmenlik", "Yenikent", "Alayköy", "Hamitköy"],
  },
  {
    province: "Kıbrıs — Girne",
    districts: ["Girne", "Alsancak", "Lapta", "Karşıyaka", "Esentepe", "Çatalköy", "Bellapais"],
  },
  {
    province: "Kıbrıs — Gazimağusa",
    districts: ["Gazimağusa", "Geçitkale", "Akdoğan", "İnönü", "Dörtyol", "Tuzla"],
  },
  {
    province: "Kıbrıs — Güzelyurt",
    districts: ["Güzelyurt", "Bafra", "Zümrütköy", "Yedidalga"],
  },
  {
    province: "Kıbrıs — İskele",
    districts: ["İskele", "Boğaz", "Mehmetçik", "Dipkarpaz", "Kumyalı", "Long Beach"],
  },
  {
    province: "Kıbrıs — Lefke",
    districts: ["Lefke", "Gemikonağı", "Yeşilyurt", "Cengizköy"],
  },
];

function sortTr(values: string[]) {
  return [...values].sort((a, b) => a.localeCompare(b, "tr"));
}

export const LOCATION_PROVINCES: LocationProvince[] = [
  ...Object.values(raw as Record<string, RawEntry>)
    .map((entry) => ({
      province: entry.province,
      districts: sortTr(entry.districts.map((district) => district.name)),
    }))
    .sort((a, b) => a.province.localeCompare(b.province, "tr")),
  ...CYPRUS_LOCATIONS,
];

export const PROVINCE_NAMES = LOCATION_PROVINCES.map((item) => item.province);

export function getDistrictsForProvince(province: string): string[] {
  return LOCATION_PROVINCES.find((item) => item.province === province)?.districts ?? [];
}

export function filterOptions(options: string[], query: string): string[] {
  const q = query.trim().toLocaleLowerCase("tr");
  if (!q) return options;
  return options.filter((option) => option.toLocaleLowerCase("tr").includes(q));
}

export function searchProvinces(query: string): LocationProvince[] {
  const q = query.trim().toLocaleLowerCase("tr");
  if (!q) return LOCATION_PROVINCES;
  return LOCATION_PROVINCES.filter(
    (item) =>
      item.province.toLocaleLowerCase("tr").includes(q) ||
      item.districts.some((district) => district.toLocaleLowerCase("tr").includes(q))
  );
}
