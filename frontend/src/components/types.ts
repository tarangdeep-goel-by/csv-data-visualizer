export interface Metadata {
  columns: string[]
  row_count: number
  column_types: Record<string, string>
  sample_data: Record<string, any>[]
  column_classifications: {
    dimensions: string[]
    metrics: string[]
  }
  dimension_flags: {
    index_dimension: string
    time_dimension: string | null
  }
}

export interface CompleteData {
  data: Record<string, any>[]
  total_rows: number
}

export interface FilterState {
  dimensions: string[]
  metrics: string[]
  filters: Record<string, any>
}

export interface AppProps {
  metadata: Metadata | null
  completeData: CompleteData | null
  loading: boolean
  error: string | null
  filterState: FilterState
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onUpload: () => void
  onDownload: () => void
  onDownloadFilteredView: () => void
  onMetadataUpdate: (newMetadata: Metadata) => void
  onFilterStateUpdate: (newFilterState: FilterState) => void
  file: File | null
}
