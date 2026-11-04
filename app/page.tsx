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

  // 弹窗内的翻页状态：'records' (打卡历史) | 'rules' (成绩判定要求)
  const [detailTab, setDetailTab] = useState<'records' | 'rules'>('records');

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
    // 自动转换用户名到伪邮箱格式
    const fakeEmail = email.includes('@') ? email : `${email}@temp.app`;

    const { error } = isRegister 
      ? await supabase.auth.signUp({ email: fakeEmail, password })
      : await supabase.auth.signInWithPassword({ email: fakeEmail, password });
    
    if (error) alert(error.message === "User already registered" ? "该用户名已被注册，请直接登录" : error.message);
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

  // 点击切换打卡状态（出席 -> 遅刻 -> 欠席 -> 出席）
  async function toggleRecordStatus(recordId: any, currentStatus: string) {
    const statusMap: { [key: string]: string } = {
      '出席': '遅刻',
      '遅刻': '欠席',
      '欠席': '出席'
    };
    const nextStatus = statusMap[currentStatus] || '出席';
    const { error } = await supabase.from('attendance_records').update({ status: nextStatus }).eq('id', recordId);
    if (!error) {
      await fetchData();
      showSuccess(`状态已更改为：${nextStatus}`);
    }
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

  // --- 新增功能：更新课程考核类型小徽章 (🚫, 考, 报) ---
  async function updateCourseExamTag(courseId: any, newTag: string) {
    const { error } = await supabase.from('courses').update({ exam_tag: newTag }).eq('id', courseId);
    if (!error) {
      setSelectedCourse((prev: any) => ({ ...prev, exam_tag: newTag }));
      await fetchData();
      showSuccess(newTag === 'none' ? '已清除徽章' : `徽章已设为【${newTag}】`);
    }
  }

  // --- 新增功能：编辑课程成绩判定要求说明 ---
  async function editCourseGradingRules(courseId: any, currentRules: string) {
    const newRules = prompt("输入成绩判定要求与考核说明（例如：定期考试60%、随堂小测40%）：", currentRules || "");
    if (newRules === null) return;
    const { error } = await supabase.from('courses').update({ grading_rules: newRules }).eq('id', courseId);
    if (!error) {
      setSelectedCourse((prev: any) => ({ ...prev, grading_rules: newRules }));
      await fetchData();
      showSuccess("成绩要求已保存");
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
            <p className="text-slate-400 text-sm mt-2">{isRegister ? '正在创建新账号' : '请使用用户名登录'}</p>
          </div>
          <div className="space-y-4">
            <input type="text" placeholder="用户名" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-blue-500" />
            <input type="password" placeholder="密码" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-blue-500" />
            <button onClick={handleAuth} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-all">
              {isRegister ? '立即注册' : '登录'}
            </button>
          </div>
          <button onClick={() => setIsRegister(!isRegister)} className="w-full text-center">
            {isRegister ? (
              <span className="text-xs text-slate-400">已有账号？去登录</span>
            ) : (
              <div className="text-xs text-slate-500">
                没有账号？请点击这里 <span className="text-red-600 font-black underline text-sm ml-1">注册新账号</span>
              </div>
            )}
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
        
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-400 font-medium">
            👤 {user?.email?.split('@')[0]}
          </span>
          <button onClick={handleLogout} className="text-[10px] text-red-400 border border-red-100 px-3 py-1 rounded-full">退出登录</button>
        </div>
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
                            onClick={() => {
                              if (course) {
                                setSelectedCourse(course);
                                setDetailTab('records'); // 默认展示打卡记录页
                              } else {
                                addNewCourse(dayMap[day], slot.range);
                              }
                            }}
                            className={`p-1 h-32 vertical-top relative border-r last:border-0 active:bg-blue-100 transition-colors cursor-pointer ${course ? 'bg-[#E3F2FD]/40' : 'hover:bg-slate-50'}`}>
                            {course ? (
                              <div className="flex flex-col h-full items-center justify-center space-y-2 relative">
                                {/* 首页课程右上角小圆形徽章 */}
                                {course.exam_tag === '考' && (
                                  <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center shadow-xs">
                                    考
                                  </span>
                                )}
                                {course.exam_tag === '报' && (
                                  <span className="absolute top-0 right-0 w-4 h-4 bg-emerald-500 text-white text-[8px] font-black rounded-full flex items-center justify-center shadow-xs">
                                    报
                                  </span>
                                )}
                                
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
              <div className="bg-[#1E40AF] p-6 text-white text-center relative">
                
                {/* 标记位置：右上角三个徽章选项（🚫、考、报） */}
                <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/10 p-1 rounded-full backdrop-blur-xs">
                  <button
                    type="button"
                    onClick={() => updateCourseExamTag(selectedCourse.id, 'none')}
                    title="无徽章"
                    className={`w-5 h-5 rounded-full text-[9px] flex items-center justify-center transition-all ${(!selectedCourse.exam_tag || selectedCourse.exam_tag === 'none') ? 'bg-white text-slate-800 font-bold shadow-xs' : 'opacity-60 hover:opacity-100'}`}
                  >
                    🚫
                  </button>
                  <button
                    type="button"
                    onClick={() => updateCourseExamTag(selectedCourse.id, '考')}
                    title="期末考试"
                    className={`w-5 h-5 rounded-full text-[9px] flex items-center justify-center font-black transition-all ${selectedCourse.exam_tag === '考' ? 'bg-red-500 text-white shadow-xs scale-105' : 'bg-red-500/40 text-white hover:bg-red-500/70'}`}
                  >
                    考
                  </button>
                  <button
                    type="button"
                    onClick={() => updateCourseExamTag(selectedCourse.id, '报')}
                    title="报告考核"
                    className={`w-5 h-5 rounded-full text-[9px] flex items-center justify-center font-black transition-all ${selectedCourse.exam_tag === '报' ? 'bg-emerald-500 text-white shadow-xs scale-105' : 'bg-emerald-500/40 text-white hover:bg-emerald-500/70'}`}
                  >
                    报
                  </button>
                </div>

                <h2 className="text-lg font-bold cursor-pointer" onClick={() => editCourseInfo(selectedCourse)}>{selectedCourse.name}</h2>
                <div className="mt-3 flex justify-center gap-2">
                  <button onClick={() => updateCourseLink(selectedCourse.id, selectedCourse.link)} className="bg-white/20 text-[10px] px-3 py-1 rounded-full border border-white/40">🔗 链接</button>
                  {selectedCourse.link && <a href={selectedCourse.link.startsWith('http') ? selectedCourse.link : `https://${selectedCourse.link}`} target="_blank" rel="noopener noreferrer" className="bg-yellow-400 text-blue-900 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm">🚀 跳转</a>}
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {['出席', '遅刻', '欠席'].map(s => (
                    <button key={s} onClick={() => handleCheckIn(selectedCourse.id, s)} className={`${s === '出席' ? 'bg-green-500' : s === '遅刻' ? 'bg-orange-400' : 'bg-red-500'} text-white py-3 rounded-2xl shadow-lg font-bold text-xs`}>{s}</button>
                  ))}
                </div>

                {/* 翻页标签栏 */}
                <div className="flex justify-between items-center border-b pb-1.5 mb-2 px-1">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setDetailTab('records')}
                      className={`text-[11px] font-bold pb-0.5 border-b-2 transition-colors ${detailTab === 'records' ? 'border-[#1E40AF] text-[#1E40AF]' : 'border-transparent text-slate-400'}`}
                    >
                      打卡历史 ({records.filter(r => r.course_id === selectedCourse.id).length})
                    </button>
                    <button 
                      onClick={() => setDetailTab('rules')}
                      className={`text-[11px] font-bold pb-0.5 border-b-2 transition-colors ${detailTab === 'rules' ? 'border-[#1E40AF] text-[#1E40AF]' : 'border-transparent text-slate-400'}`}
                    >
                      考核与判定说明 📋
                    </button>
                  </div>
                  <span className="text-[9px] text-slate-300">
                    {detailTab === 'records' ? '← 向左看说明' : '打卡记录 →'}
                  </span>
                </div>

                {/* 翻页容器：历史记录 与 考核判定说明 */}
                <div className="relative overflow-hidden min-h-[190px]">
                  <AnimatePresence mode="wait">
                    {detailTab === 'records' ? (
                      <motion.div
                        key="records-page"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-2 max-h-48 overflow-y-auto pr-1"
                      >
                        {records.filter(r => r.course_id === selectedCourse.id).length === 0 ? (
                          <div className="text-center py-10 text-xs text-slate-400">暂无打卡记录</div>
                        ) : (
                          records.filter(r => r.course_id === selectedCourse.id).map(record => (
                            <div key={record.id} className="flex flex-col p-2 bg-slate-50 rounded-lg border border-slate-100 gap-1">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-1">
                                  <input type="datetime-local" defaultValue={toLocalISOString(record.created_at)} onBlur={(e) => updateRecordTime(record.id, e.target.value)} className="text-[10px] bg-transparent text-slate-500 outline-none border-none font-mono w-32" />
                                  <button 
                                    type="button"
                                    onClick={() => toggleRecordStatus(record.id, record.status)}
                                    title="点击切换状态"
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-transform active:scale-95 ${record.status === '出席' ? 'bg-green-100 text-green-600 hover:bg-green-200' : record.status === '遅刻' ? 'bg-orange-100 text-orange-600 hover:bg-orange-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
                                  >
                                    {record.status}
                                  </button>
                                  {record.remark && <span className="text-[10px] text-blue-500 font-medium truncate max-w-[80px]">: {record.remark}</span>}
                                </div>
                                <div className="flex items-center">
                                  <button onClick={() => updateRemark(record.id, record.remark)} className="text-[10px] text-slate-400 hover:text-blue-500 px-1">📝</button>
                                  <button onClick={() => deleteRecord(record.id)} className="text-slate-300 hover:text-red-500 px-1">✕</button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="rules-page"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="h-full flex flex-col justify-between"
                      >
                        <div 
                          onClick={() => editCourseGradingRules(selectedCourse.id, selectedCourse.grading_rules)}
                          className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/70 cursor-pointer hover:bg-amber-100/60 transition-all min-h-[140px] flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[11px] font-black text-amber-900 flex items-center gap-1">
                                📌 成绩评判标准与考核说明
                              </span>
                              <span className="text-[10px] text-amber-600 font-bold underline">点击修改 ✏️</span>
                            </div>
                            <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
                              {selectedCourse.grading_rules || "暂未填写成绩判定标准，点击此处即可编辑录入（例如：定期考试 60%、随堂测验 40%、全得点 60% 以上及格）。"}
                            </p>
                          </div>
                          <span className="text-[9px] text-amber-500 mt-2">提示：包含期末/随堂测验/平时作业比例等要求</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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