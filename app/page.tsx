"use client";
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';

// --- 请保留你的真实 Supabase 信息 ---
const supabaseUrl = 'https://wvmcsjzxsovzhfwxzdlh.supabase.co'; 
const supabaseAnonKey = 'sb_publishable_Zq6TsEhSAmMEwOFgwjxE5g_uothgtWo'; 
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AttendanceApp() {
  const [view, setView] = useState<'table' | 'stats'>('table'); // 视图切换状态
  const [courses, setCourses] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function fetchData() {
    const { data: coursesData } = await supabase.from('courses').select('*').order('day_of_week', { ascending: true });
    const { data: recordsData } = await supabase.from('attendance_records').select('*').order('created_at', { ascending: false });
    setCourses((coursesData as any[]) || []);
    setRecords((recordsData as any[]) || []);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  const showSuccess = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  async function handleCheckIn(courseId: any, status: string) {
    const { error } = await supabase
      .from('attendance_records')
      .insert([{ course_id: courseId, status, created_at: new Date().toISOString() }]);
    if (!error) {
      fetchData();
      showSuccess(`${status} 打卡成功！`);
      setSelectedCourse(null);
    }
  }

  async function updateRecordTime(recordId: any, newTime: string) {
    const { error } = await supabase
      .from('attendance_records')
      .update({ created_at: new Date(newTime).toISOString() })
      .eq('id', recordId);
    if (!error) { fetchData(); showSuccess("时间已更新"); }
  }

  async function deleteRecord(recordId: any) {
    if (!confirm("确定删除吗？")) return;
    const { error } = await supabase.from('attendance_records').delete().eq('id', recordId);
    if (!error) fetchData();
  }

  const getCount = (courseId: any, status: string) => records.filter(r => r.course_id === courseId && r.status === status).length;

  if (loading) return <div className="h-screen flex items-center justify-center text-blue-500 font-bold">同步中...</div>;

  const days = ['月', '火', '水', '木', '金'];
  const dayMap: { [key: string]: number } = { '月': 1, '火': 2, '水': 3, '木': 4, '金': 5 };
  const timeSlots = [
    { id: '1', range: '9:00\n10:35' }, { id: '2', range: '10:45\n12:20' },
    { id: '3', range: '13:10\n14:45' }, { id: '4', range: '14:55\n16:30' }, { id: '5', range: '16:40\n18:15' }
  ];

  return (
    <div className="min-h-screen bg-[#F0F4F8] font-sans pb-24">
      {/* 顶部视图切换导航 */}
      <div className="bg-white border-b sticky top-0 z-30 p-2 flex justify-center gap-4 shadow-sm">
        <button 
          onClick={() => setView('table')}
          className={`px-6 py-1.5 rounded-full text-xs font-bold transition-all ${view === 'table' ? 'bg-[#1E40AF] text-white shadow-md' : 'text-slate-400'}`}
        >
          课表视图
        </button>
        <button 
          onClick={() => setView('stats')}
          className={`px-6 py-1.5 rounded-full text-xs font-bold transition-all ${view === 'stats' ? 'bg-[#1E40AF] text-white shadow-md' : 'text-slate-400'}`}
        >
          出勤汇总
        </button>
      </div>

      <AnimatePresence mode="wait">
        {view === 'table' ? (
          /* --- 课表视图 --- */
          <motion.div key="table" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="p-2">
            <div className="w-full overflow-x-auto rounded-xl border bg-white shadow-sm">
              <table className="w-full border-collapse table-fixed min-w-[380px]">
                <thead>
                  <tr className="bg-slate-50 border-b">
                    {/* 改动点 2：把“春”改为“时间带” */}
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
                          <td key={day} onClick={() => course && setSelectedCourse(course)}
                            className={`p-1 h-32 vertical-top relative border-r last:border-0 active:bg-blue-100 transition-colors ${course ? 'bg-[#E3F2FD]/40' : ''}`}>
                            {course && (
                              <div className="flex flex-col h-full items-center justify-center space-y-2">
                                <div className="text-[10px] font-bold text-[#1E40AF] text-center px-1 leading-tight">{course.name}</div>
                                <div className="text-[8px] text-slate-400 font-medium">{course.room}</div>
                                {/* 三色计数球 */}
                                <div className="flex gap-1 scale-90">
                                  <div className="flex items-center justify-center w-4 h-4 rounded-full bg-green-500 text-white text-[8px] font-bold">{getCount(course.id, '出席')}</div>
                                  <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-400 text-white text-[8px] font-bold">{getCount(course.id, '遅刻')}</div>
                                  <div className="flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-bold">{getCount(course.id, '欠席')}</div>
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
          /* --- 汇总统计视图 --- */
          <motion.div key="stats" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="p-4">
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <table className="w-full border-collapse text-center">
                <thead>
                  {/* 改动点 1：表头字体颜色设为黑色 (text-black) */}
                  <tr className="bg-yellow-200 border-b">
                    <th className="py-2 border-r text-xs font-bold text-black">科目名</th>
                    <th className="py-2 border-r text-xs font-bold w-16 text-black">出席</th>
                    <th className="py-2 border-r text-xs font-bold w-16 text-black">迟到</th>
                    <th className="py-2 text-xs font-bold w-16 text-black">欠席</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map(course => {
                    const late = getCount(course.id, '遅刻');
                    const absent = getCount(course.id, '欠席');
                    return (
                      <tr key={course.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 border-r text-[11px] text-left text-slate-700 font-medium">{course.name}</td>
                        <td className="py-2 border-r text-[12px] font-mono">{getCount(course.id, '出席')}</td>
                        <td className={`py-2 border-r text-[12px] font-mono ${late > 0 ? 'bg-green-100 text-green-700 font-bold' : ''}`}>{late}</td>
                        <td className={`py-2 text-[12px] font-mono ${absent > 0 ? 'bg-red-100 text-red-600 font-bold' : ''}`}>{absent}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 居中详情面板 (保持原样) */}
      <AnimatePresence>
        {selectedCourse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              onClick={() => setSelectedCourse(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative z-10">
              <div className="bg-[#1E40AF] p-6 text-white text-center">
                <h2 className="text-lg font-bold">{selectedCourse.name}</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[{s:'出席',c:'bg-green-500'}, {s:'遅刻',c:'bg-orange-400'}, {s:'欠席',c:'bg-red-500'}].map(b => (
                    <button key={b.s} onClick={() => handleCheckIn(selectedCourse.id, b.s)}
                      className={`${b.c} text-white py-3 rounded-2xl shadow-lg active:scale-90 transition-all font-bold text-xs`}>
                      {b.s === '遅刻' ? '迟到' : b.s === '欠席' ? '欠席' : '出席'}
                    </button>
                  ))}
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {records.filter(r => r.course_id === selectedCourse.id).map(record => (
                    <div key={record.id} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <input type="datetime-local" 
                        defaultValue={new Date(record.created_at).toISOString().slice(0, 16)}
                        onChange={(e) => updateRecordTime(record.id, e.target.value)}
                        className="text-[10px] bg-transparent text-slate-500 outline-none"
                      />
                      <button onClick={() => deleteRecord(record.id)} className="text-slate-300 px-2">✕</button>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => setSelectedCourse(null)} className="w-full py-3 bg-slate-50 text-slate-400 text-xs font-bold">关闭</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 成功提示 Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-blue-600 text-white px-6 py-2 rounded-full shadow-2xl font-bold text-sm">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}