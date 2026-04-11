"use client";
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';

// 已自动填入你的 Supabase 信息
const supabaseUrl = 'https://wvmcsjzxsovzhfwxzdlh.supabase.co'; 
const supabaseAnonKey = 'sb_publishable_Zq6TsEhSAmMEwOFgwjxE5g_uothgtWo'; 
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AttendanceApp() {
  const [view, setView] = useState<'table' | 'stats'>('table');
  const [semester, setSemester] = useState<'春' | '秋'>('春'); // 学期切换状态
  const [courses, setCourses] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 用于编辑课程的状态
  const [selectedSlot, setSelectedSlot] = useState<{day: number, slot: string, course?: any} | null>(null);
  const [editName, setEditName] = useState('');
  const [editRoom, setEditRoom] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  async function fetchData() {
    const { data: c } = await supabase.from('courses').select('*');
    const { data: r } = await supabase.from('attendance_records').select('*');
    setCourses(c || []);
    setRecords(r || []);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  const showSuccess = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  // 保存或修改课程名
  async function saveCourse() {
    if (!editName) return;
    const payload = {
      name: editName,
      room: editRoom,
      day_of_week: selectedSlot?.day,
      time_slot: selectedSlot?.slot,
      semester: semester
    };

    let error;
    if (selectedSlot?.course) {
      // 修改已有课程
      const { error: err } = await supabase.from('courses').update(payload).eq('id', selectedSlot.course.id);
      error = err;
    } else {
      // 在空白格新增课程
      const { error: err } = await supabase.from('courses').insert([payload]);
      error = err;
    }

    if (!error) {
      fetchData();
      showSuccess("课程信息已更新");
      setSelectedSlot(null);
    }
  }

  async function handleCheckIn(courseId: any, status: string) {
    const { error } = await supabase.from('attendance_records').insert([{ course_id: courseId, status }]);
    if (!error) {
      fetchData();
      showSuccess(`${status} 记录成功`);
      setSelectedSlot(null);
    }
  }

  const getCount = (courseId: any, status: string) => records.filter(r => r.course_id === courseId && r.status === status).length;

  if (loading) return <div className="h-screen flex items-center justify-center text-blue-600 font-black">LOADING...</div>;

  const days = ['月', '火', '水', '木', '金'];
  const timeSlots = [
    { id: '1', range: '9:00' }, { id: '2', range: '10:45' },
    { id: '3', range: '13:10' }, { id: '4', range: '14:55' }, { id: '5', range: '16:40' }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 text-slate-900">
      {/* 顶部导航栏 */}
      <div className="bg-white border-b sticky top-0 z-30 p-2 flex justify-between items-center px-4 shadow-sm">
        <button onClick={() => setSemester(semester === '春' ? '秋' : '春')} 
          className="bg-blue-50 text-[#1E40AF] px-4 py-1.5 rounded-xl text-sm font-black border border-blue-100 active:scale-95 transition-all">
          {semester}学期 ⇅
        </button>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button onClick={() => setView('table')} className={`px-5 py-1 rounded-lg text-xs font-black transition-all ${view === 'table' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>课表视图</button>
          <button onClick={() => setView('stats')} className={`px-5 py-1 rounded-lg text-xs font-black transition-all ${view === 'stats' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>出勤汇总</button>
        </div>
        <div className="w-16"></div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'table' ? (
          /* --- 课表视图 --- */
          <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-2">
            <div className="w-full overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-xl">
              <table className="w-full border-collapse table-fixed min-w-[380px]">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="w-[12%] py-4 text-[12px] font-black text-slate-900 border-b border-r">时</th>
                    {days.map(day => <th key={day} className="py-4 text-[12px] font-black text-slate-900 border-b border-r last:border-r-0">{day}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((slot) => (
                    <tr key={slot.id} className="border-b last:border-0">
                      <td className="text-center py-4 bg-slate-50/30 border-r font-black text-[10px] text-slate-400">{slot.id}</td>
                      {days.map((day, idx) => {
                        // 过滤当前学期的课程
                        const course = courses.find(c => c.day_of_week === idx + 1 && c.time_slot === slot.range && c.semester === semester);
                        return (
                          <td key={day} onClick={() => {
                            setSelectedSlot({ day: idx + 1, slot: slot.range, course });
                            setEditName(course?.name || '');
                            setEditRoom(course?.room || '');
                          }}
                            className={`p-1 h-32 relative border-r last:border-0 active:bg-blue-50 transition-colors cursor-pointer ${course ? 'bg-[#E3F2FD]/40' : ''}`}>
                            {course && (
                              <div className="flex flex-col h-full items-center justify-center space-y-3">
                                <div className="text-[10px] font-black text-[#1E40AF] text-center leading-tight px-1">{course.name}</div>
                                <div className="flex gap-1.5 scale-90">
                                  <div className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-[9px] font-black shadow-sm">{getCount(course.id, '出席')}</div>
                                  <div className="w-5 h-5 rounded-full bg-orange-400 text-white flex items-center justify-center text-[9px] font-black shadow-sm">{getCount(course.id, '遅刻')}</div>
                                  <div className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[9px] font-black shadow-sm">{getCount(course.id, '欠席')}</div>
                                </div>
                              </div>
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
          /* --- 汇总视图 (高度还原截图样式) --- */
          <motion.div key="stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
              <table className="w-full border-collapse text-center">
                <thead className="bg-[#FFE500]">
                  <tr className="border-b-2 border-slate-800">
                    <th className="py-3 px-4 border-r border-slate-800 text-sm font-black text-black text-left uppercase">科目名 ({semester})</th>
                    <th className="w-16 border-r border-slate-800 text-sm font-black text-black">出席</th>
                    <th className="w-16 border-r border-slate-800 text-sm font-black text-black">迟到</th>
                    <th className="w-16 text-sm font-black text-black">欠席</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.filter(c => c.semester === semester).map(course => {
                    const late = getCount(course.id, '遅刻');
                    const absent = getCount(course.id, '欠席');
                    return (
                      <tr key={course.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-4 px-4 border-r border-slate-100 text-[12px] font-black text-left text-slate-700">{course.name}</td>
                        <td className="py-4 border-r border-slate-100 text-[13px] font-black">{getCount(course.id, '出席')}</td>
                        <td className={`py-4 border-r border-slate-100 text-[13px] font-black ${late > 0 ? 'bg-green-50 text-green-700' : 'text-slate-300'}`}>{late}</td>
                        <td className={`py-4 text-[13px] font-black ${absent > 0 ? 'bg-red-50 text-red-600' : 'text-slate-300'}`}>{absent}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 底部交互面板 */}
      <AnimatePresence>
        {selectedSlot && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedSlot(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
              className="bg-white rounded-t-[40px] sm:rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl relative z-10 p-8">
              
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-tighter">课程编辑</span>
                  <span className="text-[10px] font-black text-slate-400">{semester}学期</span>
                </div>
                <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="输入课程名 (如: 信号处理)" 
                  className="w-full text-xl font-black p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none mb-3 transition-all" />
                <input value={editRoom} onChange={e => setEditRoom(e.target.value)} placeholder="教室 (如: C507)" 
                  className="w-full text-sm font-black p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none mb-4 transition-all" />
                <button onClick={saveCourse} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-200 active:scale-95 transition-all">确认保存修改</button>
              </div>

              {selectedSlot.course && (
                <div className="pt-8 border-t border-slate-100 text-center">
                  <p className="text-[10px] font-black text-slate-400 mb-4 tracking-widest uppercase">快捷打卡</p>
                  <div className="grid grid-cols-3 gap-4">
                    {[{s:'出席',c:'bg-green-500'}, {s:'遅刻',c:'bg-orange-400'}, {s:'欠席',c:'bg-red-500'}].map(b => (
                      <button key={b.s} onClick={() => handleCheckIn(selectedSlot.course.id, b.s)}
                        className={`${b.c} text-white py-4 rounded-2xl font-black text-xs active:scale-90 transition-all shadow-lg`}>{b.s === '遅刻' ? '迟到' : b.s}</button>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={() => setSelectedSlot(null)} className="w-full mt-8 py-2 text-slate-300 font-black text-xs">点击空白处关闭窗口</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 全局通知 */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl font-black text-xs">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}