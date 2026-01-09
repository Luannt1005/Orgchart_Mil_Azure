/**
 * Organization Chart Data Types
 */

export interface OrgNode {
  id: string | number;
  name: string;
  title?: string;
  photo?: string;
  img?: string;
  pid?: string | number; // Parent ID
  stpid?: string | number; // Secondary Task Parent ID
  tags?: string[];
  dept?: string;
  BU?: string; // Business Unit
  type?: string;
  orig_pid?: string | number;
  [key: string]: any;
}

export interface ApiResponse<T> {
  data: T[];
  gs_response?: any;
  status?: string;
  error?: string;
}

export interface FilterDeptParams {
  group?: string;
}

export interface AddDepartmentPayload {
  name: string;
  pid?: string | number;
  title?: string;
  img?: string;
}

export interface UpdateNodePayload {
  id: string | number;
  name?: string;
  title?: string;
  pid?: string | number;
  img?: string;
  [key: string]: any;
}

export interface RemoveNodePayload {
  id: string | number;
}

export interface OrgDataContextType {
  nodes: OrgNode[];
  groups: string[];
  loading: boolean;
  error: Error | null;
  mutate: () => Promise<any>;
}
