"use client";
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- 请务必保留你的 Supabase 信息 ---
const supabaseUrl = 'https://wvmcsjzxsovzhfwxzdlh.supabase.co'; 
const supabaseAnonKey = 'sb_publishable_Zq6TsEhSAmMEwOFgwjxE5g_uothgtWo'; 
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AttendanceApp() {
  const [courses, setCourses] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 16)); // 用于手动改日期

  async function fetchData() {
    const { data: coursesData } = await supabase.from('courses').select('*');
    const { data: recordsData } = await supabase.from('attendance_records').select('*').order('created_at', { ascending: false });
    setCourses((coursesData as any[]) || []);
    setRecords((recordsData as any[]) || []);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  // 打卡功能：支持传入手动选择的时间
  async function handleCheckIn(courseId: any, status: string) {
    const { error } = await supabase
      .from('attendance_records')
      .insert([{ 
        course_id: courseId, 
        status: status,
        created_at: new Date(manualDate).toISOString() // 使用选定的时间
      }]);
    if (!error) fetchData();
    else alert("操作失败");
  }

  // 删除功能：解决误触
  async function deleteRecord(recordId: any) {
    if (!confirm("确定要删除这条记录吗？")) return;
    const { error } = await supabase.from('attendance_records').delete().eq('id', recordId);
    if (!error) fetchData();
    else alert("删除失败");
  }

  const getStats = (courseId: any, status: string) => records.filter(r => r.course_id === courseId && r.status === status).length;

  if (loading) return <div className="p-10 text-center text-gray-500">正在同步数据...</div>;

  const days = ['周一', '周二', '周三', '周四', '周五'];
  const dayMap: { [key: string]: number } = { '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5 };
  const slots = ['9:00', '10:45', '13:10', '14:55', '16:40', '18:25'];

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans text-[14px]">
      {/* 顶部控制栏 */}
      <div className="bg-blue-700 p-4 sticky top-0 z-20 shadow-lg">
        <h1 className="text-white text-center font-bold mb-2">学生出勤管理 (手机适配版)</h1>
        <div className="flex justify-center items-center gap-2">
          <label className="text-white text-[11px]">补签日期:</label>
          <input 
            type="datetime-local" 
            value={manualDate}
            onChange={(e) => setManualDate(e.target.value)}
            className="text-[11px] p-1 rounded border-none bg-blue-600 text-white outline-none"
          />
        </div>
      </div>

      <div className="overflow-x-auto p-2">
        <div className="min-w-[700px] bg-white rounded-lg shadow border border-slate-200">
          <table className="w-full border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-50">
                <th className="border-b p-2 w-12 text-[10px] text-slate-400">时间</th>
                {days.map(day => <th key={day} className="border-b border-l p-2 text-xs font-bold text-slate-700">{day}</th>)}
              </tr>
            </thead>
            <tbody>
              {slots.map((time) => (
                <tr key={time}>
                  <td className="border-b p-1 text-center text-[9px] bg-slate-50/50 text-slate-400">{time}</td>
                  {days.map(day => {
                    const course = courses.find(c => c.day_of_week === dayMap[day] && c.time_slot.startsWith(time));
                    return (
                      <td key={day} className="border-b border-l p-1 h-36 vertical-top relative hover:bg-blue-50/20">
                        {course ? (
                          <div className="flex flex-col h-full overflow-hidden">
                            <div className="cursor-pointer mb-1" onClick={() => setSelectedCourse(course)}>
                              <div className="text-[10px] font-bold text-blue-900 leading-tight truncate">{course.name}</div>
                              <div className="text-[8px] text-slate-400 truncate">{course.room}</div>
                            </div>
                            
                            <div className="flex gap-1 mb-1 scale-[0.85] origin-left">
                              <span className="bg-green-100 text-green-700 px-1 rounded font-bold whitespace-nowrap">{getStats(course.id, '出席')}</span>
                              <span className="bg-orange-100 text-orange-700 px-1 rounded font-bold whitespace-nowrap">{getStats(course.id, '迟')}</span>
                              <span className="bg-red-100 text-red-700 px-1 rounded font-bold whitespace-nowrap">{getStats(course.id, '缺')}</span>
                            </div>

                            <div className="grid grid-cols-1 gap-1 mt-auto">
                              <button onClick={() => handleCheckIn(course.id, '出席')} className="bg-green-500 text-white text-[9px] py-1 rounded">出席</button>
                              <button onClick={() => handleCheckIn(course.id, '遅刻')} className="bg-orange-400 text-white text-[9px] py-1 rounded">迟到</button>
                              <button onClick={() => handleCheckIn(course.id, '欠席')} className="bg-red-500 text-white text-[9px] py-1 rounded">欠席</button>
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

      {/* 详情弹窗 + 删除功能 */}
      {selectedCourse && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-sm">{selectedCourse.name}</h2>
              <button onClick={() => setSelectedCourse(null)} className="text-2xl text-slate-400">&times;</button>
            </div>
            <div className="p-4 overflow-y-auto space-y-2">
              {records.filter(r => r.course_id === selectedCourse.id).map(record => (
                <div key={record.id} className="flex justify-between items-center p-3 bg-slate-50 rounded border border-slate-100">
                  <div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded mr-2 ${
                      record.status === '出席' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>{record.status}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(record.created_at).toLocaleString('zh-CN', {month:'numeric', day:'numeric', hour:'numeric', minute:'numeric'})}
                    </span>
                  </div>
                  <button onClick={() => deleteRecord(record.id)} className="text-red-400 hover:text-red-600 text-xs px-2 py-1">删除</button>
                </div>
              ))}
            </div>
            <button onClick={() => setSelectedCourse(null)} className="m-4 p-2 bg-slate-100 rounded text-xs font-bold">关闭</button>
          </div>
        </div>
      )}
    </div>
  );
}