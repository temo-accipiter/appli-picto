// src/hooks/usePermissionsAPI.js
import { supabase } from '@/utils/supabaseClient'

function usePermissionsAPI() {
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
