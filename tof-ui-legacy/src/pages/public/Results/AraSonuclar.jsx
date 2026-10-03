import ResultsDynamicTable from "./ResultsDynamicTable";

export default function AraSonuclar() {
  return (
      <ResultsDynamicTable
        source="intermediate"
        title="Ara Sonuçlar"
        enableSearch={false}
      />
  );
}
