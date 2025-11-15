// src/hooks/usePermissionsAPI.ts
import { supabase } from '@/utils/supabaseClient'
import type { SupabaseClient } from '@supabase/supabase-js'

interface UsePermissionsAPIReturn {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getMyPrimaryRole: () => any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getMyPermissions: () => any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getFeatures: () => any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAllPermissions: () => any
  supabase: SupabaseClient
}

function usePermissionsAPI(): UsePermissionsAPIReturn {
  return {
    // RPC "self" stables
    getMyPrimaryRole: () => supabase.rpc('get_my_primary_role'),
    getMyPermissions: () => supabase.rpc('get_my_permissions'),

    // Utiles pour écrans admin / debug
    getFeatures: () => supabase.from('features').select('*').order('name'),
    getAllPermissions: () =>
      supabase.from('role_permissions').select('role_id,feature_id,can_access'),

    // on expose le client si besoin ailleurs
    supabase,
  }
}

export default usePermissionsAPI
