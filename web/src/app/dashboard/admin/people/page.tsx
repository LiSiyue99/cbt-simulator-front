"use client";

import { useEffect, useState } from "react";
import { getAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser, getAssignmentStudents, assignTemplate, assignAssistant, bulkAssign, getAssistantStudentsAdmin, addAssistantStudentAdmin, removeAssistantStudentAdmin } from "@/services/api/assistant";

export default function AdminPeoplePage() {
  const [tab, setTab] = useState<'users'|'assignments'|'assistants'>('users');
  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-semibold">人员与分配</h2>
      <div className="flex gap-2">
        <TabButton active={tab==='users'} onClick={()=>setTab('users')}>用户管理</TabButton>
        <TabButton active={tab==='assignments'} onClick={()=>setTab('assignments')}>学生分配</TabButton>
        <TabButton active={tab==='assistants'} onClick={()=>setTab('assistants')}>助教负责学生</TabButton>
      </div>
      <div className="bg-white border rounded-xl shadow-sm p-4">
        {tab==='users' && <UsersTab />}
        {tab==='assignments' && <AssignmentsTab />}
        {tab==='assistants' && <AssistantsTab />}
      </div>
    </div>
  );
}

function TabButton({ active, children, onClick }: { active: boolean; children: any; onClick: ()=>void }){
  return (
    <button onClick={onClick} className={`px-3 py-1 rounded ${active? 'bg-emerald-600 text-white':'border'}`}>{children}</button>
  )
}

function UsersTab(){
  const [list, setList] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ role: 'student', status: 'active', templateKey: '' });
  const [filter, setFilter] = useState<any>({});
  const [editing, setEditing] = useState<any|null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<string>('email');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc');
  const [showShadow, setShowShadow] = useState(false);
  const tableWrapId = 'users-table-wrap';
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(50);
  const [total, setTotal] = useState<number>(0);
  useEffect(()=>{ load(); },[page, filter]);
  async function load(){ const res = await getAdminUsers({ ...filter, page, pageSize } as any); setList(res.items); setTotal((res as any).total||0); }
  async function create(){
    const res = await createAdminUser(form);
    try {
      // 若为学生且填写了模板键，则自动为其创建实例并绑定助教
      if ((form.role === 'student') && form.templateKey) {
        await assignTemplate({ studentId: (res as any).id, templateKey: String(form.templateKey) });
      }
    } catch {}
    setForm({ role:'student', status:'active', templateKey: '' });
    await load();
  }
  async function saveEdit(){ if(!editing) return; const { id, ...body } = editing; await updateAdminUser(id, body); setEditing(null); await load(); }
  async function toggleActive(u:any){ await updateAdminUser(u.id, { status: u.status==='active' ? 'inactive':'active' }); await load(); }
  function getRolePill(role: string){
    const map: any = {
      student: 'bg-blue-50 text-blue-700 border-blue-200',
      assistant_tech: 'bg-amber-50 text-amber-700 border-amber-200',
      assistant_class: 'bg-violet-50 text-violet-700 border-violet-200',
      admin: 'bg-gray-50 text-gray-700 border-gray-200'
    };
    return <span className={`px-2 py-0.5 rounded-full border text-xs ${map[role]||map.admin}`}>{role}</span>;
  }
  function getStatusPill(status: string){
    const cls = status==='active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200';
    const text = status==='active' ? 'active' : 'inactive';
    return <span className={`px-2 py-0.5 rounded-full border text-xs ${cls}`}>{text}</span>;
  }
  function renderEmpty(v:any){ return <span className="text-gray-400">-</span>; }
  function toggleSelect(id:string){ setSelectedIds(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]); }
  async function bulkSetStatus(newStatus: 'active'|'inactive'){
    for (const id of selectedIds) await updateAdminUser(id, { status: newStatus });
    setSelectedIds([]); await load();
  }
  function onSort(key:string){ if(sortKey===key) setSortDir(sortDir==='asc'?'desc':'asc'); else { setSortKey(key); setSortDir('asc'); } }
  const sorted = [...list].sort((a:any,b:any)=>{
    const va = a[sortKey] ?? ''; const vb = b[sortKey] ?? '';
    if(va===vb) return 0; const res = va>vb?1:-1; return sortDir==='asc'?res:-res;
  });
  function SortHeader({label, keyName}:{label:string; keyName:string}){
    const active = sortKey===keyName; const arrow = active ? (sortDir==='asc'?'▲':'▼') : '↕';
    return <button className={`flex items-center gap-1 text-xs ${active?'text-emerald-700':'text-gray-600'}`} onClick={()=>onSort(keyName)}><span>{label}</span><span>{arrow}</span></button>;
  }
  return (
    <div className="space-y-6">
      {/* 新增用户 */}
      <div className="space-y-2">
        <h3 className="font-semibold">新增用户</h3>
        <div className="grid grid-cols-2 gap-2 max-w-3xl">
          <input className="border rounded px-2 py-1" placeholder="姓名" value={form.name||''} onChange={e=>setForm({ ...form, name:e.target.value })} />
          <input className="border rounded px-2 py-1" placeholder="邮箱" value={form.email||''} onChange={e=>setForm({ ...form, email:e.target.value })} />
          <select className="border rounded px-2 py-1" value={form.role} onChange={e=>setForm({ ...form, role:e.target.value })}>
            <option value="student">student</option>
            <option value="assistant_tech">assistant_tech</option>
            <option value="assistant_class">assistant_class</option>
            <option value="admin">admin</option>
          </select>
          <input className="border rounded px-2 py-1" placeholder="classId" value={form.classId||''} onChange={e=>setForm({ ...form, classId:e.target.value })} />
          <input className="border rounded px-2 py-1" placeholder="userId(学号/工号)" value={form.userId||''} onChange={e=>setForm({ ...form, userId:e.target.value })} />
          <input className="border rounded px-2 py-1" placeholder="模板键(1..10，可选)" value={form.templateKey||''} onChange={e=>setForm({ ...form, templateKey:e.target.value })} />
          <button className="border rounded px-2 py-1" onClick={create}>创建</button>
        </div>
      </div>
      {/* 已有用户管理 */}
      <div className="relative overflow-x-auto" id={tableWrapId} onScroll={(e)=>{
        const el = e.currentTarget; setShowShadow(el.scrollLeft + el.clientWidth < el.scrollWidth);
      }}>
        <h3 className="font-semibold mb-2">已有用户管理</h3>
        <div className="flex gap-2 mb-2">
          <input className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="搜索（邮箱/姓名/学号）" onChange={e=>setFilter({ ...filter, q:e.target.value })} />
          <select className="border rounded px-2 py-1" onChange={e=>setFilter({ ...filter, role:e.target.value })}>
            <option value="">全部角色</option>
            <option value="student">student</option>
            <option value="assistant_tech">assistant_tech</option>
            <option value="assistant_class">assistant_class</option>
            <option value="admin">admin</option>
          </select>
          <button className="border rounded px-2 py-1" onClick={load}>刷新</button>
        </div>
        {selectedIds.length>0 && (
          <div className="mb-2 flex gap-2 items-center text-sm">
            <span className="text-gray-500">已选 {selectedIds.length} 项</span>
            <button className="px-2 py-1 rounded border" onClick={()=>bulkSetStatus('active')}>批量启用</button>
            <button className="px-2 py-1 rounded text-white bg-red-600" onClick={()=>bulkSetStatus('inactive')}>批量停用</button>
          </div>
        )}
        <div className="border rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs">
                <th className="py-1.5 px-2"><input type="checkbox" onChange={e=> setSelectedIds(e.target.checked ? sorted.map(u=>u.id) : []) } checked={selectedIds.length>0 && selectedIds.length===sorted.length} /></th>
                <th className="py-1.5 px-2 text-left"><SortHeader label="姓名" keyName="name"/></th>
                <th className="py-1.5 px-2 w-[260px] whitespace-nowrap"><SortHeader label="邮箱" keyName="email"/></th>
                <th className="py-1.5 px-2 w-[140px] whitespace-nowrap"><SortHeader label="角色" keyName="role"/></th>
                <th className="py-1.5 px-2 text-left"><SortHeader label="classId" keyName="classId"/></th>
                <th className="py-1.5 px-2 text-left"><SortHeader label="userId" keyName="userId"/></th>
                <th className="py-1.5 px-2"><SortHeader label="状态" keyName="status"/></th>
                <th className="py-1.5 px-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(u=> (
                <tr key={u.id} className="border-t align-middle">
                  <td className="py-1.5 px-2"><input type="checkbox" checked={selectedIds.includes(u.id)} onChange={()=>toggleSelect(u.id)} /></td>
                  <td className="py-1.5 px-2 text-left whitespace-nowrap font-medium">{u.name||renderEmpty(u.name)}</td>
                  <td className="py-1.5 px-2 whitespace-nowrap max-w-[260px] truncate">{u.email}</td>
                  <td className="py-1.5 px-2 whitespace-nowrap max-w-[140px]">{getRolePill(u.role)}</td>
                  <td className="py-1.5 px-2 whitespace-nowrap text-left">{u.classId ?? renderEmpty(u.classId)}</td>
                  <td className="py-1.5 px-2 whitespace-nowrap text-left">{u.userId ?? renderEmpty(u.userId)}</td>
                  <td className="py-1.5 px-2 whitespace-nowrap">{getStatusPill(u.status)}</td>
                  <td className="py-1.5 px-2 space-x-2 whitespace-nowrap">
                    <button className="px-2 py-1 rounded border" onClick={()=>setEditing(u)}>编辑</button>
                    <button className="px-2 py-1 rounded text-white bg-red-600" onClick={()=>toggleActive(u)}>{u.status==='active'?'停用':'启用'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {showShadow && <div className="pointer-events-none absolute top-0 right-0 h-full w-6 bg-gradient-to-l from-white" />}
      </div>
      {/* Pagination */}
      <div className="flex items-center justify-between mt-3 text-sm text-gray-600">
        <div>共 {(total||0)} 项，每页 {pageSize}</div>
        <div className="flex gap-2">
          <button className="border rounded px-2 py-1" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>上一页</button>
          <span>第 {page} 页</span>
          <button className="border rounded px-2 py-1" disabled={page*pageSize>=total} onClick={()=>setPage(p=>p+1)}>下一页</button>
        </div>
      </div>
      {editing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={()=>setEditing(null)}>
          <div className="bg-white rounded shadow-xl p-4 w-full max-w-lg" onClick={(e)=>e.stopPropagation()}>
            <h4 className="font-semibold mb-3">编辑用户</h4>
            <div className="grid grid-cols-2 gap-2">
              <input className="border rounded px-2 py-1" value={editing.name||''} onChange={e=>setEditing({ ...editing, name:e.target.value })} />
              <input className="border rounded px-2 py-1" value={editing.email||''} onChange={e=>setEditing({ ...editing, email:e.target.value })} />
              <select className="border rounded px-2 py-1" value={editing.role} onChange={e=>setEditing({ ...editing, role:e.target.value })}>
                <option value="student">student</option>
                <option value="assistant_tech">assistant_tech</option>
                <option value="assistant_class">assistant_class</option>
                <option value="admin">admin</option>
              </select>
              <input className="border rounded px-2 py-1" value={editing.classId||''} onChange={e=>setEditing({ ...editing, classId:e.target.value })} />
              <input className="border rounded px-2 py-1" value={editing.userId||''} onChange={e=>setEditing({ ...editing, userId:e.target.value })} />
              <select className="border rounded px-2 py-1" value={editing.status||'active'} onChange={e=>setEditing({ ...editing, status:e.target.value })}>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button className="border rounded px-3 py-1" onClick={()=>setEditing(null)}>取消</button>
              <button className="bg-emerald-600 text-white rounded px-3 py-1" onClick={saveEdit}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AssignmentsTab(){
  const [list, setList] = useState<any[]>([]);
  const [filter, setFilter] = useState<any>({});
  const [selected, setSelected] = useState<any|null>(null);
  const [tplKey, setTplKey] = useState<string>('');
  useEffect(()=>{ load(); },[]);
  async function load(){ const res = await getAssignmentStudents(filter); setList(res.items); if(res.items?.length && !selected) setSelected(res.items[0]); }
  async function applyTemplate(){ if(!selected || !tplKey) return; await assignTemplate({ studentId: selected.studentId, templateKey: tplKey }); setTplKey(''); await load(); }
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* 左：学生列表 */}
      <div className="xl:col-span-1">
        <div className="flex gap-2 mb-3">
          <input className="border rounded px-2 py-1 w-full" placeholder="搜索学生（邮箱/姓名/学号）" onChange={e=>setFilter({ ...filter, q:e.target.value })} />
          <button className="border rounded px-2 py-1" onClick={load}>刷新</button>
        </div>
        <div className="border rounded max-h-[32rem] overflow-auto">
          {(list||[]).map(s=> (
            <div key={s.studentId} className={`px-3 py-2 border-b cursor-pointer ${selected?.studentId===s.studentId?'bg-emerald-50':''}`} onClick={()=>setSelected(s)}>
              <div className="font-medium">{s.name||s.email}</div>
              <div className="text-xs text-gray-500">{s.email} · class {s.classId||'-'}</div>
            </div>
          ))}
        </div>
      </div>
      {/* 右：操作面板 */}
      <div className="xl:col-span-2 space-y-6">
        {!selected ? <div className="text-sm text-gray-500">请选择学生</div> : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="border rounded p-3">
              <div className="font-semibold mb-2">设置模板（单选）</div>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({length:10}).map((_,i)=>{
                  const key = String(i+1);
                  const checked = tplKey===key;
                  return (
                    <label key={key} className={`px-2 py-1 border rounded text-center cursor-pointer ${checked?'bg-emerald-600 text-white border-emerald-600':'bg-white'}`}> 
                      <input type="radio" className="hidden" checked={checked} onChange={()=> setTplKey(key)} />
                      {key}
                    </label>
                  );
                })}
              </div>
              <button className="mt-3 bg-emerald-600 text-white rounded px-3 py-1" onClick={applyTemplate}>应用模板并自动分配助教</button>
              <div className="mt-2 text-xs text-gray-500">现有：{selected.instances.map((i:any)=> i.templateKey).join(', ')||'无'}；助教：{selected.assistants.map((a:any)=> a.assistantName).join(', ')||'无'}</div>
              <div className="mt-1 text-xs text-emerald-700">提示：选择模板后，系统会根据模板负责关系自动绑定助教；同一学生仅保留一个模板实例。</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function AssistantsTab(){
  const [assistants, setAssistants] = useState<any[]>([]);
  const [selected, setSelected] = useState<any|null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState<string>('');
  const [addForm, setAddForm] = useState<any>({ studentId: '', templateKey: '' });

  useEffect(()=>{ loadAssistants(); },[search]);
  async function loadAssistants(){ const res = await getAdminUsers({ role: 'assistant_tech', q: search }); setAssistants(res.items); if(res.items.length && !selected) setSelected(res.items[0]); }
  useEffect(()=>{ if(selected) loadStudents(); },[selected]);
  async function loadStudents(){ const res = await getAssistantStudentsAdmin(selected.id); setStudents(res.items || []); }
  async function addRelation(){ if(!selected) return; await addAssistantStudentAdmin({ assistantId: selected.id, studentId: addForm.studentId, templateKey: addForm.templateKey }); setAddForm({ studentId:'', templateKey:'' }); await loadStudents(); }
  async function removeRelation(id:string){ await removeAssistantStudentAdmin(id); await loadStudents(); }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div>
        <div className="flex gap-2 mb-2">
          <input className="border rounded px-2 py-1" placeholder="搜索助教" value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <div className="border rounded max-h-96 overflow-auto">
          {assistants.map(a=> (
            <div key={a.id} className={`px-3 py-2 border-b cursor-pointer ${selected?.id===a.id?'bg-emerald-50':''}`} onClick={()=>setSelected(a)}>{a.name||a.email}</div>
          ))}
        </div>
      </div>
      <div className="lg:col-span-2">
        {!selected ? <div className="text-sm text-gray-500">请选择助教</div> : (
          <div>
            <div className="mb-3 font-semibold">{selected.name||selected.email} 的负责学生</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {students.map((rel:any)=> (
                <div key={rel.id} className="border rounded p-2 flex items-center justify-between">
                  <div className="text-sm flex items-center gap-2">
                    <span className="font-medium text-foreground">{rel.studentName||rel.studentEmail}</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                      <span>{rel.visitorName||'AI访客'}</span>
                      <span className="opacity-70">模板 {rel.templateKey||'-'}</span>
                    </span>
                  </div>
                  <button className="border rounded px-2" onClick={()=>removeRelation(rel.id)}>移除</button>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <div className="text-sm text-gray-600 mb-2">添加负责关系（需学生ID，可选模板键）</div>
              <div className="flex gap-2">
                <input className="border rounded px-2 py-1" placeholder="studentId" value={addForm.studentId} onChange={e=>setAddForm({ ...addForm, studentId: e.target.value })} />
                <input className="border rounded px-2 py-1" placeholder="模板键(1..10，可选)" value={addForm.templateKey} onChange={e=>setAddForm({ ...addForm, templateKey: e.target.value })} />
                <button className="border rounded px-2" onClick={addRelation}>添加</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


