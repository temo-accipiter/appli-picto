// src/hooks/usePermissionsAPI.ts
import { supabase } from '@/utils/supabaseClient'
import type { SupabaseClient } from '@supabase/supabase-js'

interface UsePermissionsAPIReturn {
  getMyPrimaryRole: () => ReturnType<typeof supabase.rpc<'get_my_primary_role'>>
  getMyPermissions: () => ReturnType<typeof supabase.rpc<'get_my_permissions'>>
  getFeatures: () => ReturnType<typeof supabase.from<'features'>>
  getAllPermissions: () => ReturnType<typeof supabase.from<'role_permissions'>>
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
