"use client";
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- 请在这里填入你的 Supabase 信息 ---
const supabaseUrl = 'https://wvmcsjzxsovzhfwxzdlh.supabase.co'; 
const supabaseAnonKey = 'sb_publishable_Zq6TsEhSAmMEwOFgwjxE5g_uothgtWo';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AttendanceApp() {
  const [courses, setCourses] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null); // 用于控制详情弹窗

  async function fetchData() {
    const { data: coursesData } = await supabase.from('courses').select('*');
    const { data: recordsData } = await supabase.from('attendance_records').select('*').order('created_at', { ascending: false });
    setCourses(coursesData || []);
    setRecords(recordsData || []);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  async function handleCheckIn(courseId, status) {
    const { error } = await supabase
      .from('attendance_records')
      .insert([{ course_id: courseId, status: status }]);
    if (!error) fetchData();
    else alert("打卡失败");
  }

  const getStats = (courseId, status) => records.filter(r => r.course_id === courseId && r.status === status).length;

  if (loading) return <div className="p-10 text-center text-gray-500">正在连接数据库...</div>;

  const days = ['周一', '周二', '周三', '周四', '周五'];
  const dayMap = { '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5 };
  const slots = ['9:00', '10:45', '13:10', '14:55', '16:40', '18:25'];

  return (
    <div className="min-h-screen bg-slate-50 p-2 sm:p-4 pb-20">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden relative">
        <div className="bg-blue-600 p-4 sticky top-0 z-10">
          <h1 className="text-white text-xl font-bold text-center">出勤打卡系统</h1>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse table-fixed min-w-[850px]">
            <thead>
              <tr className="bg-slate-100">
                <th className="border p-2 w-16 text-sm text-slate-600">时间</th>
                {days.map(day => <th key={day} className="border p-2 text-sm font-semibold text-slate-700">{day}</th>)}
              </tr>
            </thead>
            <tbody>
              {slots.map((time) => (
                <tr key={time}>
                  <td className="border p-1 text-center text-[10px] font-medium bg-slate-50 text-slate-500">{time}</td>
                  {days.map(day => {
                    const course = courses.find(c => c.day_of_week === dayMap[day] && c.time_slot.startsWith(time));
                    return (
                      <td key={day} className="border p-2 h-40 vertical-top relative hover:bg-slate-50 transition-colors">
                        {course ? (
                          <div className="flex flex-col h-full shrink-0">
                            <div className="cursor-pointer group" onClick={() => setSelectedCourse(course)}>
                              <div className="text-[11px] font-bold text-blue-800 leading-tight mb-1 group-hover:underline">
                                {course.name} 📋
                              </div>
                              <div className="text-[9px] text-slate-400">{course.room}</div>
                            </div>
                            
                            <div className="flex flex-wrap gap-1 mt-auto py-1">
                              <span className="bg-green-50 text-green-700 text-[9px] px-1 rounded border border-green-200">出:{getStats(course.id, '出席')}</span>
                              <span className="bg-orange-50 text-orange-700 text-[9px] px-1 rounded border border-orange-200">迟:{getStats(course.id, '遅刻')}</span>
                              <span className="bg-red-50 text-red-700 text-[9px] px-1 rounded border border-red-200">缺:{getStats(course.id, '欠席')}</span>
                            </div>

                            <div className="grid grid-cols-3 gap-1 mt-1">
                              <button onClick={() => handleCheckIn(course.id, '出席')} className="bg-green-500 text-white text-[9px] py-1 rounded shadow-sm">出席</button>
                              <button onClick={() => handleCheckIn(course.id, '遅刻')} className="bg-orange-400 text-white text-[9px] py-1 rounded shadow-sm">迟到</button>
                              <button onClick={() => handleCheckIn(course.id, '欠席')} className="bg-red-500 text-white text-[9px] py-1 rounded shadow-sm">欠席</button>
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

      {/* --- 详情弹窗 (Modal) --- */}
      {selectedCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-lg">
              <h2 className="font-bold text-blue-800">{selectedCourse.name} - 打卡记录</h2>
              <button onClick={() => setSelectedCourse(null)} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
            </div>
            <div className="p-4 overflow-y-auto">
              {records.filter(r => r.course_id === selectedCourse.id).length === 0 ? (
                <p className="text-center text-slate-400 py-10">暂无打卡记录</p>
              ) : (
                <div className="space-y-2">
                  {records.filter(r => r.course_id === selectedCourse.id).map(record => (
                    <div key={record.id} className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-100">
                      <span className={`text-xs font-bold ${
                        record.status === '出席' ? 'text-green-600' : record.status === '遅刻' ? 'text-orange-500' : 'text-red-500'
                      }`}>
                        {record.status}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(record.created_at).toLocaleString('zh-CN', { hour12: false })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t">
              <button onClick={() => setSelectedCourse(null)} className="w-full py-2 bg-slate-200 rounded font-medium text-sm">关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}