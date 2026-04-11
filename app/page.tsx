"use client";
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- 请务必填入你的真实 Supabase 信息 ---
const supabaseUrl = 'https://wvmcsjzxsovzhfwxzdlh.supabase.co'; 
const supabaseAnonKey = 'sb_publishable_Zq6TsEhSAmMEwOFgwjxE5g_uothgtWo'; 
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AttendanceApp() {
  // 修改了这里，增加了类型定义以通过 Vercel 检查
  const [courses, setCourses] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);

  async function fetchData() {
    const { data: coursesData } = await supabase.from('courses').select('*');
    const { data: recordsData } = await supabase.from('attendance_records').select('*').order('created_at', { ascending: false });
    // 强制断言为 any 避开类型检查
    setCourses((coursesData as any[]) || []);
    setRecords((recordsData as any[]) || []);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  async function handleCheckIn(courseId: any, status: string) {
    const { error } = await supabase
      .from('attendance_records')
      .insert([{ course_id: courseId, status: status }]);
    if (!error) fetchData();
    else alert("打卡失败");
  }

  const getStats = (courseId: any, status: string) => records.filter(r => r.course_id === courseId && r.status === status).length;

  if (loading) return <div className="p-10 text-center text-gray-500">正在同步课表...</div>;

  const days = ['周一', '周二', '周三', '周四', '周五'];
  const dayMap: { [key: string]: number } = { '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5 };
  const slots = ['9:00', '10:45', '13:10', '14:55', '16:40', '18:25'];

  return (
    <div className="min-h-screen bg-slate-100 p-2 sm:p-4 pb-20 font-sans">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-md overflow-hidden border border-slate-200">
        <div className="bg-blue-700 p-4 sticky top-0 z-10 shadow-sm">
          <h1 className="text-white text-lg font-bold text-center tracking-wider">学生出勤管理系统</h1>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse table-fixed min-w-[850px]">
            <thead>
              <tr className="bg-slate-50">
                <th className="border-b p-2 w-16 text-[11px] text-slate-500 uppercase">时间</th>
                {days.map(day => <th key={day} className="border-b border-l p-2 text-sm font-bold text-slate-700">{day}</th>)}
              </tr>
            </thead>
            <tbody>
              {slots.map((time) => (
                <tr key={time} className="group">
                  <td className="border-b p-2 text-center text-[10px] font-semibold bg-slate-50 text-slate-400">{time}</td>
                  {days.map(day => {
                    const course = courses.find(c => c.day_of_week === dayMap[day] && c.time_slot.startsWith(time));
                    return (
                      <td key={day} className="border-b border-l p-2 h-44 vertical-top relative hover:bg-blue-50/30 transition-colors">
                        {course ? (
                          <div className="flex flex-col h-full shrink-0">
                            <div className="cursor-pointer mb-2" onClick={() => setSelectedCourse(course)}>
                              <div className="text-[11px] font-extrabold text-blue-900 leading-tight group-hover:text-blue-600 transition-colors">
                                {course.name} <span className="text-[10px] opacity-50">🔍</span>
                              </div>
                              <div className="text-[9px] text-slate-400 mt-1 font-medium">{course.room}</div>
                            </div>
                            
                            <div className="flex flex-wrap gap-1 mt-auto py-2 border-t border-slate-50">
                              <span className="bg-green-100 text-green-800 text-[9px] px-1.5 py-0.5 rounded-sm font-bold">出:{getStats(course.id, '出席')}</span>
                              <span className="bg-orange-100 text-orange-800 text-[9px] px-1.5 py-0.5 rounded-sm font-bold">迟:{getStats(course.id, '遅刻')}</span>
                              <span className="bg-red-100 text-red-800 text-[9px] px-1.5 py-0.5 rounded-sm font-bold">缺:{getStats(course.id, '欠席')}</span>
                            </div>

                            <div className="grid grid-cols-3 gap-1">
                              <button onClick={() => handleCheckIn(course.id, '出席')} className="bg-green-500 hover:bg-green-600 text-white text-[9px] py-1.5 rounded font-bold shadow-sm active:scale-95 transition-all">出席</button>
                              <button onClick={() => handleCheckIn(course.id, '遅刻')} className="bg-orange-400 hover:bg-orange-500 text-white text-[9px] py-1.5 rounded font-bold shadow-sm active:scale-95 transition-all">迟到</button>
                              <button onClick={() => handleCheckIn(course.id, '欠席')} className="bg-red-500 hover:bg-red-600 text-white text-[9px] py-1.5 rounded font-bold shadow-sm active:scale-95 transition-all">欠席</button>
                            </div>
                          </div>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCourse && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm max-h-[70vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-sm text-slate-800">{selectedCourse.name} 记录详情</h2>
              <button onClick={() => setSelectedCourse(null)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-4 overflow-y-auto">
              {records.filter(r => r.course_id === selectedCourse.id).length === 0 ? (
                <p className="text-center text-slate-400 py-12 text-sm italic">尚无打卡数据</p>
              ) : (
                <div className="space-y-3">
                  {records.filter(r => r.course_id === selectedCourse.id).map(record => (
                    <div key={record.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className={`text-xs font-black px-2 py-0.5 rounded ${
                        record.status === '出席' ? 'bg-green-100 text-green-700' : 
                        record.status === '遅刻' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {record.status}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-1 rounded border border-slate-200 shadow-xs">
                        {new Date(record.created_at).toLocaleString('zh-CN', { hour12: false })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t bg-slate-50 rounded-b-xl">
              <button onClick={() => setSelectedCourse(null)} className="w-full py-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold text-xs shadow-sm">关闭窗口</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}