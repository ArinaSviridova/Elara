import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const TeenContext = createContext(null)

export function TeenProvider({ children }) {
  const { user, profile } = useAuth()
  const [parentConnections, setParentConnections] = useState([])

  const isTeen = profile?.age_mode === 'teen'
  const birthYear = profile?.birth_year
  const age = birthYear ? new Date().getFullYear() - birthYear : null

  // Определяем подстиль для подростка по возрасту
  function getTeenStyle() {
    if (!isTeen) return null
    if (!age || age < 13) return 'first_period'  // первые месячные, очень мягко
    if (age <= 15) return 'early_teen'            // ранний подросток
    return 'teen'                                  // обычный подросток
  }

  useEffect(() => {
    if (user && isTeen) fetchParents()
  }, [user, isTeen])

  async function fetchParents() {
    const { data } = await supabase
      .from('parent_connections')
      .select('*, parent:parent_id(id, name, invite_code)')
      .eq('teen_id', user.id)
    setParentConnections(data || [])
  }

  async function addParent(inviteCode, permissions) {
    const { data: parent } = await supabase
      .from('profiles').select('id, name').eq('invite_code', inviteCode.toUpperCase()).maybeSingle()
    if (!parent) return { error: 'Код не найден' }
    if (parent.id === user.id) return { error: 'Нельзя добавить себя' }

    const { error } = await supabase.from('parent_connections').insert({
      teen_id: user.id,
      parent_id: parent.id,
      ...permissions,
    })
    if (!error) fetchParents()
    return { error: error?.message }
  }

  async function updateParentPermissions(connectionId, permissions) {
    await supabase.from('parent_connections').update(permissions).eq('id', connectionId)
    fetchParents()
  }

  async function removeParent(connectionId) {
    await supabase.from('parent_connections').delete().eq('id', connectionId)
    fetchParents()
  }

  return (
    <TeenContext.Provider value={{
      isTeen, age, teenStyle: getTeenStyle(),
      parentConnections, addParent, updateParentPermissions, removeParent,
      refetch: fetchParents,
    }}>
      {children}
    </TeenContext.Provider>
  )
}

export const useTeen = () => useContext(TeenContext)
