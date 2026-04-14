"use client";
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';

const supabaseUrl = 'https://wvmcsjzxsovzhfwxzdlh.supabase.co'; 
const supabaseAnonKey = 'sb_publishable_Zq6TsEhSAmMEwOFgwjxE5g_uothgtWo'; 
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AttendanceApp() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);

  const [view, setView] = useState<'table' | 'stats'>('table');
  const [courses, setCourses] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [toast, setToast] = useState<string | null>(null);

  // --- 新增功能：处理书签端发来的抓取数据 ---
  useEffect(() => {
    if (!user || loading) return;

    const params = new URLSearchParams(window.location.search);
    const autoName = params.get('autoName');
    const autoRoom = params.get('autoRoom');
    const day = params.get('day');
    const slot = params.get('slot');

    if (autoName) {
      const confirmed = confirm(`检测到抓取的课程信息：\n\n课程：${autoName}\n教室：${autoRoom || '未识别'}\n\n是否添加到课表？`);
      if (confirmed) {
        handleBookmarkAdd(autoName, autoRoom, day, slot);
      } else {
        // 清理 URL，防止重复弹窗
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [user, loading]);

  async function handleBookmarkAdd(name: string, room: string | null, day: string | null, slot: string | null) {
    const finalDay = day ? parseInt(day) : 1;
    const finalSlot = slot || "9:00";

    const { error } = await supabase.from('courses').insert([{ 
      name, 
      room, 
      day_of_week: finalDay, 
      time_slot: finalSlot,
      user_id: user.id 
    }]);

    if (!error) { 
      await fetchData(); 
      showSuccess("抓取课程添加成功！"); 
      // 清理 URL 参数
      window.history.replaceState({}, '', window.location.pathname);
    }
  }
  // --- 新增功能结束 ---

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchData();
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchData();
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: coursesData } = await supabase.from('courses').select('*').order('day_of_week', { ascending: true });
    const { data: recordsData } = await supabase.from('attendance_records').select('*').order('created_at', { ascending: false });
    setCourses((coursesData as any[]) || []);
    setRecords((recordsData as any[]) || []);
    setLoading(false);
  }

  async function handleAuth() {
    setLoading(true);
    const { error } = isRegister 
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    
    if (error) alert(error.message);
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setCourses([]);
    setRecords([]);
  }

  const showSuccess = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const toLocalISOString = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  async function addNewCourse(dayOfWeek: number, timeRange: string) {
    const name = prompt("输入新课程名称：");
    if (!name) return;
    const room = prompt("输入教室地点：", "");
    
    const { error } = await supabase.from('courses').insert([{ 
      name, room, day_of_week: dayOfWeek, 
      time_slot: timeRange.split('\n')[0],
      user_id: user.id 
    }]);

    if (!error) { fetchData(); showSuccess("课程已添加"); }
  }

  async function editCourseInfo(course: any) {
    const newName = prompt("修改课程名称：", course.name);
    if (!newName) return;
    const newRoom = prompt("修改教室地点：", course.room || "");
    const { error } = await supabase.from('courses').update({ name: newName, room: newRoom }).eq('id', course.id);
    if (!error) { setSelectedCourse({ ...course, name: newName, room: newRoom }); fetchData(); showSuccess("修改成功"); }
  }

  async function deleteCourse(courseId: any) {
    if (!confirm("确定要删除这门课程吗？这将同时删除该课程的所有出勤记录，且无法恢复。")) return;
    await supabase.from('attendance_records').delete().eq('course_id', courseId);
    const { error } = await supabase.from('courses').delete().eq('id', courseId);
    if (!error) {
      setSelectedCourse(null);
      fetchData();
      showSuccess("课程已永久删除");
    }
  }

  async function handleCheckIn(courseId: any, status: string) {
    const { error } = await supabase.from('attendance_records').insert([{ 
      course_id: courseId, status, created_at: new Date().toISOString(),
      user_id: user.id 
    }]);
    if (!error) { fetchData(); showSuccess(`${status} 打卡成功！`); setSelectedCourse(null); }
  }

  async function updateRecordTime(recordId: any, newTime: string) {
    if (!newTime) return;
    const timeWithTimezone = `${newTime}:00+09:00`; 
    const { error } = await supabase.from('attendance_records').update({ created_at: timeWithTimezone }).eq('id', recordId);
    if (!error) { fetchData(); showSuccess("时间已更新"); }
  }

  async function updateRemark(recordId: any, currentRemark: string) {
    const newRemark = prompt("修改/添加备注：", currentRemark || "");
    if (newRemark === null) return;
    const { error } = await supabase.from('attendance_records').update({ remark: newRemark }).eq('id', recordId);
    if (!error) { await fetchData(); showSuccess("备注已保存"); }
  }

  async function updateCourseLink(courseId: any, currentLink: string) {
    const newLink = prompt("修改/添加课程链接：", currentLink || "");
    if (newLink === null) return;
    const { error } = await supabase.from('courses').update({ link: newLink }).eq('id', courseId);
    if (!error) {
      const { data: updatedCourse } = await supabase.from('courses').select('*').eq('id', courseId).single();
      setSelectedCourse(updatedCourse); fetchData(); showSuccess("链接已保存");
    }
  }

  async function deleteRecord(recordId: any) {
    if (!confirm("确定删除这条记录吗？")) return;
    const { error } = await supabase.from('attendance_records').delete().eq('id', recordId);
    if (!error) fetchData();
  }

  const getCount = (courseId: any, status: string) => records.filter(r => r.course_id === courseId && r.status === status).length;

  if (!user && !loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-900">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-blue-900">课表助手</h1>
            <p className="text-slate-400 text-sm mt-2">{isRegister ? '创建新账号' : '请先登录'}</p>
          </div>
          <div className="space-y-4">
            <input type="email" placeholder="邮箱" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-blue-500" />
            <input type="password" placeholder="密码" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-blue-500" />
            <button onClick={handleAuth} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-all">
              {isRegister ? '注册' : '登录'}
            </button>
          </div>
          <button onClick={() => setIsRegister(!isRegister)} className="w-full text-xs text-slate-400 text-center">
            {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="h-screen flex items-center justify-center text-blue-500 font-bold">同步中...</div>;

  const days = ['月', '火', '水', '木', '金'];
  const dayMap: { [key: string]: number } = { '月': 1, '火': 2, '水': 3, '木': 4, '金': 5 };
  const timeSlots = [
    { id: '1', range: '9:00\n10:35' }, { id: '2', range: '10:45\n12:20' },
    { id: '3', range: '13:10\n14:45' }, { id: '4', range: '14:55\n16:30' }, { id: '5', range: '16:40\n18:15' }
  ];

  return (
    <div className="min-h-screen bg-[#F0F4F8] font-sans pb-24 text-slate-900">
      <div className="bg-white border-b sticky top-0 z-30 p-2 flex justify-between items-center px-4 shadow-sm">
        <div className="flex gap-2 items-center">
          {/* 新增按钮：跳转学校课程系统 */}
          <a 
            href="https://syllabus.ritsumei.ac.jp/syllabus/search/search_top.do" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[10px] bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full font-bold hover:bg-slate-200 transition-colors mr-1"
          >
            🔍 查找课程
          </a>
          <button onClick={() => setView('table')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${view === 'table' ? 'bg-[#1E40AF] text-white shadow-md' : 'text-slate-400'}`}>课表</button>
          <button onClick={() => setView('stats')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${view === 'stats' ? 'bg-[#1E40AF] text-white shadow-md' : 'text-slate-400'}`}>汇总</button>
        </div>
        <button onClick={handleLogout} className="text-[10px] text-red-400 border border-red-100 px-3 py-1 rounded-full">退出登录</button>
      </div>

      <AnimatePresence mode="wait">
        {view === 'table' ? (
          <motion.div key="table" className="p-2">
            <div className="w-full overflow-x-auto rounded-xl border bg-white shadow-sm">
              <table className="w-full border-collapse table-fixed min-w-[380px]">
                <thead>
                  <tr className="bg-slate-50 border-b">
                    <th className="w-[12%] py-2 text-[10px] font-bold text-slate-400">时间带</th>
                    {days.map(day => <th key={day} className="py-2 text-xs font-bold text-slate-600">{day}曜日</th>)}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((slot) => (
                    <tr key={slot.id} className="border-b last:border-0">
                      <td className="text-center py-4 bg-slate-50/50 border-r">
                        <div className="text-[10px] font-bold text-slate-400 leading-tight whitespace-pre-line">{slot.id}{'\n'}{slot.range}</div>
                      </td>
                      {days.map(day => {
                        const course = courses.find(c => c.day_of_week === dayMap[day] && c.time_slot.startsWith(slot.range.split('\n')[0]));
                        return (
                          <td key={day} 
                            onClick={() => course ? setSelectedCourse(course) : addNewCourse(dayMap[day], slot.range)}
                            className={`p-1 h-32 vertical-top relative border-r last:border-0 active:bg-blue-100 transition-colors cursor-pointer ${course ? 'bg-[#E3F2FD]/40' : 'hover:bg-slate-50'}`}>
                            {course ? (
                              <div className="flex flex-col h-full items-center justify-center space-y-2">
                                <div className="text-[10px] font-bold text-[#1E40AF] text-center px-1 leading-tight">{course.name}</div>
                                <div className="text-[8px] text-slate-400 font-medium">{course.room}</div>
                                <div className="flex gap-1 scale-90">
                                  <div className="flex items-center justify-center w-4 h-4 rounded-full bg-green-500 text-white text-[8px] font-bold">{getCount(course.id, '出席')}</div>
                                  <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-400 text-white text-[8px] font-bold">{getCount(course.id, '遅刻')}</div>
                                  <div className="flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-bold">{getCount(course.id, '欠席')}</div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex h-full items-center justify-center text-slate-200 text-xl font-thin">+</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          <motion.div key="stats" className="p-4">
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <table className="w-full border-collapse text-center">
                <thead><tr className="bg-yellow-200 border-b"><th className="py-2 border-r text-xs font-bold text-black">科目名</th><th className="py-2 border-r text-xs font-bold w-16 text-black">出席</th><th className="py-2 border-r text-xs font-bold w-16 text-black">迟到</th><th className="py-2 text-xs font-bold w-16 text-black">欠席</th></tr></thead>
                <tbody>
                  {courses.map(course => {
                    const lateCount = getCount(course.id, '遅刻');
                    const absentCount = getCount(course.id, '欠席');
                    return (
                      <tr key={course.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 border-r text-[11px] text-left text-slate-700 font-medium">{course.name}</td>
                        <td className="py-2 border-r text-[12px] font-mono">{getCount(course.id, '出席')}</td>
                        <td className={`py-2 border-r text-[12px] font-mono ${lateCount > 0 ? 'bg-orange-100 text-orange-700' : ''}`}>{lateCount}</td>
                        <td className={`py-2 text-[12px] font-mono ${absentCount > 0 ? 'bg-red-100 text-red-700' : ''}`}>{absentCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedCourse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedCourse(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative z-10">
              <div className="bg-[#1E40AF] p-6 text-white text-center">
                <h2 className="text-lg font-bold cursor-pointer" onClick={() => editCourseInfo(selectedCourse)}>{selectedCourse.name}</h2>
                <div className="mt-3 flex justify-center gap-2">
                  <button onClick={() => updateCourseLink(selectedCourse.id, selectedCourse.link)} className="bg-white/20 text-[10px] px-3 py-1 rounded-full border border-white/40">🔗 链接</button>
                  {selectedCourse.link && <a href={selectedCourse.link.startsWith('http') ? selectedCourse.link : `https://${selectedCourse.link}`} target="_blank" rel="noopener noreferrer" className="bg-yellow-400 text-blue-900 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm">🚀 跳转</a>}
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {['出席', '遅刻', '欠席'].map(s => (
                    <button key={s} onClick={() => handleCheckIn(selectedCourse.id, s)} className={`${s === '出席' ? 'bg-green-500' : s === '遅刻' ? 'bg-orange-400' : 'bg-red-500'} text-white py-3 rounded-2xl shadow-lg font-bold text-xs`}>{s}</button>
                  ))}
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {records.filter(r => r.course_id === selectedCourse.id).map(record => (
                    <div key={record.id} className="flex flex-col p-2 bg-slate-50 rounded-lg border border-slate-100 gap-1">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1">
                          <input type="datetime-local" defaultValue={toLocalISOString(record.created_at)} onBlur={(e) => updateRecordTime(record.id, e.target.value)} className="text-[10px] bg-transparent text-slate-500 outline-none border-none font-mono w-32" />
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${record.status === '出席' ? 'bg-green-100 text-green-600' : record.status === '遅刻' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}`}>{record.status}</span>
                          {record.remark && <span className="text-[10px] text-blue-500 font-medium truncate max-w-[80px]">: {record.remark}</span>}
                        </div>
                        <div className="flex items-center">
                          <button onClick={() => updateRemark(record.id, record.remark)} className="text-[10px] text-slate-400 hover:text-blue-500 px-1">📝</button>
                          <button onClick={() => deleteRecord(record.id)} className="text-slate-300 hover:text-red-500 px-1">✕</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button 
                onClick={() => deleteCourse(selectedCourse.id)}
                className="w-full py-2 bg-red-50 text-red-400 text-[10px] font-bold border-t border-red-100 hover:bg-red-100 transition-colors"
              >
                🗑️ 删除此课程
              </button>
              <button onClick={() => setSelectedCourse(null)} className="w-full py-3 bg-slate-50 text-slate-400 text-xs font-bold">关闭</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-blue-600 text-white px-6 py-2 rounded-full shadow-2xl font-bold text-sm">{toast}</motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}