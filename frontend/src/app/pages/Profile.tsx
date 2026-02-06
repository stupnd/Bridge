import { useNavigate } from "react-router";
import { User, Mail, Calendar, Award, LogOut, Settings, Info } from "lucide-react";

export default function Profile() {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/");
  };

  const stats = [
    { label: "Words Learned", value: "127", icon: Award },
    { label: "Practice Sessions", value: "45", icon: Calendar },
    { label: "Current Streak", value: "12 days", icon: Calendar },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 pb-24 md:pb-6">
      <h1 className="text-3xl mb-8">Account</h1>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl shadow-md p-8 mb-6 border border-gray-100">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center">
            <User className="w-12 h-12 text-indigo-600" />
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl mb-2">Sarah Johnson</h2>
            <div className="flex flex-col md:flex-row gap-4 text-gray-600 mb-4">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <Mail className="w-4 h-4" />
                <span className="text-sm">sarah.johnson@example.com</span>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Joined Jan 2026</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-md p-6 border border-gray-100"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl">{stat.value}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Prototype Notice */}
      <div className="bg-indigo-50 rounded-xl p-4 mb-6 border border-indigo-100">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-indigo-800">
            Stats shown are representative for prototype demonstration
          </p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl shadow-md p-6 mb-6 border border-gray-100">
        <h3 className="text-xl mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {[
            { action: "Completed lesson", detail: "Greetings - Basic Signs", time: "2 hours ago" },
            { action: "Practiced word", detail: "Thank You", time: "5 hours ago" },
            { action: "Reached milestone", detail: "100 words learned", time: "1 day ago" },
            { action: "Completed lesson", detail: "Food & Drink Vocabulary", time: "2 days ago" },
          ].map((activity, index) => (
            <div key={index} className="flex items-start gap-3 py-3 border-b last:border-b-0 border-gray-100">
              <div className="w-2 h-2 bg-indigo-600 rounded-full mt-2" />
              <div className="flex-1">
                <p className="text-gray-900">{activity.action}</p>
                <p className="text-sm text-gray-600">{activity.detail}</p>
              </div>
              <span className="text-sm text-gray-500">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Settings & Actions */}
      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
        <h3 className="text-xl mb-4">Settings</h3>
        <div className="space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
            <Settings className="w-5 h-5" />
            <span>App Settings</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}