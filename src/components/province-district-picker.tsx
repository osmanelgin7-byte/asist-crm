"use client";

import { useMemo } from "react";
import { SearchableSelect } from "@/components/searchable-select";
import { getDistrictsForProvince, searchProvinces } from "@/lib/locations";

interface ProvinceDistrictPickerProps {
  province: string;
  district: string;
  onProvinceChange: (value: string) => void;
  onDistrictChange: (value: string) => void;
}

export function ProvinceDistrictPicker({
  province,
  district,
  onProvinceChange,
  onDistrictChange,
}: ProvinceDistrictPickerProps) {
  const districtOptions = useMemo(() => {
    const districts = getDistrictsForProvince(province);
    if (district && !districts.includes(district)) {
      return [district, ...districts];
    }
    return districts;
  }, [province, district]);

  return (
    <>
      <SearchableSelect
        label="İl"
        value={province}
        onChange={(next) => {
          onProvinceChange(next);
          if (next !== province) onDistrictChange("");
        }}
        options={[]}
        resolveOptions={(query) => searchProvinces(query).map((item) => item.province)}
        placeholder="İl ara…"
      />
      <SearchableSelect
        label="İlçe"
        value={district}
        onChange={onDistrictChange}
        options={districtOptions}
        placeholder={province ? "İlçe ara…" : "Önce il seçin"}
        disabled={!province}
        emptyMessage={province ? "İlçe bulunamadı" : "Önce il seçin"}
      />
    </>
  );
}
