"use client";
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';

const supabaseUrl = 'https://wvmcsjzxsovzhfwxzdlh.supabase.co'; 
const supabaseAnonKey = 'sb_publishable_Zq6TsEhSAmMEwOFgwjxE5g_uothgtWo'; 
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AttendanceApp() {
  const [courses, setCourses] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function fetchData() {
    const { data: coursesData } = await supabase.from('courses').select('*');
    const { data: recordsData } = await supabase.from('attendance_records').select('*').order('created_at', { ascending: false });
    setCourses((coursesData as any[]) || []);
    setRecords((recordsData as any[]) || []);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  // 成功反馈
  const showSuccess = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  // 打卡逻辑
  async function handleCheckIn(courseId: any, status: string, customDate?: string) {
    const date = customDate ? new Date(customDate) : new Date();
    const { error } = await supabase
      .from('attendance_records')
      .insert([{ course_id: courseId, status, created_at: date.toISOString() }]);
    if (!error) {
      fetchData();
      showSuccess(`${status} 打卡成功！`);
    }
  }

  // 修改单条历史记录的时间
  async function updateRecordTime(recordId: any, newTime: string) {
    const { error } = await supabase
      .from('attendance_records')
      .update({ created_at: new Date(newTime).toISOString() })
      .eq('id', recordId);
    if (!error) {
      fetchData();
      showSuccess("时间已更新");
    }
  }

  async function deleteRecord(recordId: any) {
    if (!confirm("确定删除此记录？")) return;
    const { error } = await supabase.from('attendance_records').delete().eq('id', recordId);
    if (!error) fetchData();
  }

  if (loading) return <div className="h-screen flex items-center justify-center text-blue-500 font-bold">载入中...</div>;

  const days = ['月', '火', '水', '木', '金'];
  const dayMap: { [key: string]: number } = { '月': 1, '火': 2, '水': 3, '木': 4, '金': 5 };
  const timeSlots = [
    { id: '1', range: '9:00\n10:35' }, { id: '2', range: '10:45\n12:20' },
    { id: '3', range: '13:10\n14:45' }, { id: '4', range: '14:55\n16:30' }, { id: '5', range: '16:40\n18:15' }
  ];

  return (
    <div className="min-h-screen bg-[#F0F4F8] p-2 sm:p-4 pb-20 font-sans select-none">
      {/* 成功提示弹窗 */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] bg-blue-600 text-white px-6 py-3 rounded-full shadow-2xl font-bold">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full overflow-x-auto rounded-xl shadow-sm border border-slate-200 bg-white">
        <table className="w-full border-collapse table-fixed min-w-[400px]">
          <thead>
            <tr className="bg-[#F8FAFC]">
              <th className="border-b border-r p-2 w-[12%]"></th>
              {days.map(day => <th key={day} className="border-b border-r p-2 text-sm font-bold text-slate-600">{day}</th>)}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((slot) => (
              <tr key={slot.id}>
                <td className="border-b border-r p-2 text-center bg-[#F8FAFC]">
                  <div className="text-xs font-bold text-slate-400 leading-tight whitespace-pre-line">{slot.id}{'\n'}{slot.range}</div>
                </td>
                {days.map(day => {
                  const course = courses.find(c => c.day_of_week === dayMap[day] && c.time_slot.startsWith(slot.range.split('\n')[0]));
                  return (
                    <td key={day} onClick={() => course && setSelectedCourse(course)}
                      className={`border-b border-r p-1 h-32 vertical-top relative transition-all ${course ? 'bg-[#E3F2FD] active:bg-[#BBDEFB] cursor-pointer' : 'bg-white'}`}>
                      {course && (
                        <div className="flex flex-col h-full items-center justify-center p-1">
                          <div className="text-[10px] font-bold text-[#1E40AF] leading-tight mb-1 text-center">{course.name}</div>
                          <div className="bg-white/60 px-1 rounded text-[8px] text-[#64748B] border border-blue-100">{course.room}</div>
                          {records.some(r => r.course_id === course.id) && (
                             <div className="absolute bottom-1 right-1 w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_5px_rgba(59,130,246,0.5)]"></div>
                          )}
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

      {/* 居中详情面板 */}
      <AnimatePresence>
        {selectedCourse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              onClick={() => setSelectedCourse(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative z-10">
              
              <div className="bg-[#1E40AF] p-6 text-white text-center">
                <h2 className="text-xl font-bold mb-1">{selectedCourse.name}</h2>
                <p className="text-blue-200 text-xs">{selectedCourse.room} 教室</p>
              </div>

              <div className="p-6">
                <p className="text-[10px] font-bold text-slate-400 mb-3 tracking-widest uppercase text-center">快捷打卡</p>
                <div className="grid grid-cols-3 gap-3 mb-8">
                  {[
                    { s: '出席', c: 'bg-green-500', t: '出席' },
                    { s: '遅刻', c: 'bg-orange-400', t: '迟到' },
                    { s: '欠席', c: 'bg-red-500', t: '缺席' }
                  ].map(btn => (
                    <button key={btn.s} onClick={() => handleCheckIn(selectedCourse.id, btn.s)}
                      className={`${btn.c} text-white py-3 rounded-2xl shadow-lg shadow-blue-100 active:scale-90 transition-all font-bold text-xs`}>
                      {btn.t}
                    </button>
                  ))}
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">历史记录</span>
                    <button onClick={() => {
                       const d = prompt("输入补签时间 (格式: 2026/04/12 10:00)");
                       if(d) handleCheckIn(selectedCourse.id, '出席', d);
                    }} className="text-blue-600 text-[10px] font-bold">+ 补签</button>
                  </div>
                  
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {records.filter(r => r.course_id === selectedCourse.id).map(record => (
                      <div key={record.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                        <div className="flex flex-col">
                          <span className={`text-[10px] font-bold mb-1 ${record.status === '出席' ? 'text-green-600' : 'text-red-500'}`}>{record.status}</span>
                          <input type="datetime-local" 
                            defaultValue={new Date(record.created_at).toISOString().slice(0, 16)}
                            onChange={(e) => updateRecordTime(record.id, e.target.value)}
                            className="text-[9px] bg-transparent text-slate-400 font-mono focus:text-blue-600 outline-none"
                          />
                        </div>
                        <button onClick={() => deleteRecord(record.id)} className="text-slate-300 hover:text-red-400 text-sm">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button onClick={() => setSelectedCourse(null)} className="w-full py-4 bg-slate-50 text-slate-400 text-xs font-bold hover:bg-slate-100 transition-colors">关闭窗口</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}