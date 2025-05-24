export interface Version {
    id: string;
    parent_id: string;
    name: string;
    description?: string;
    created_at: string;  // ISO date string
    created_by: string;
    filter_criteria: any;  // TODO: Replace with proper FilterRequest type
    metadata_state: {
        column_classifications: Record<string, string[]>;
        dimension_flags: {
            index_dimension: string;
            time_dimension?: string;
        };
    };
    is_active: boolean;
}

export interface VersionManagerProps {
    versions: Version[];
    currentVersionId: string | null;
    onSaveVersion: (name: string, description: string) => Promise<void>;
    onLoadVersion: (versionId: string) => Promise<void>;
    onDeleteVersion: (versionId: string) => Promise<void>;
    loading?: boolean;
} 