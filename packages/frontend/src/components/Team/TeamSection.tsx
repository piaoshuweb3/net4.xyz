'use client';

import { Github, Twitter, Linkedin, Mail } from 'lucide-react';

interface TeamMember {
  name: string;
  role: string;
  bio: string;
  avatar?: string;
  social?: {
    twitter?: string;
    github?: string;
    linkedin?: string;
    email?: string;
  };
}

const teamMembers: TeamMember[] = [
  {
    name: '飘叔',
    role: '创始人 & 架构师',
    bio: 'Web4.0 感知互联网概念提出者，20年互联网从业经验，前大厂技术总监。',
    social: {
      twitter: '#',
      github: '#',
      email: 'mailto:founder@net4.xyz',
    },
  },
  {
    name: 'Alex Chen',
    role: 'CTO',
    bio: '资深区块链工程师，曾参与多个知名公链开发，专注于共识机制设计。',
    social: {
      twitter: '#',
      github: '#',
      linkedin: '#',
    },
  },
  {
    name: 'Sarah Zhang',
    role: '首席 AI 科学家',
    bio: '机器学习博士，前 AI 研究院负责人，专注于 ZK-ML 验证技术。',
    social: {
      twitter: '#',
      github: '#',
      linkedin: '#',
    },
  },
  {
    name: 'Michael Wang',
    role: '产品总监',
    bio: '10年产品经验，曾主导多个千万级用户产品设计。',
    social: {
      twitter: '#',
      linkedin: '#',
    },
  },
];

export default function TeamSection() {
  return (
    <section id="team" className="py-24 px-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-purple-900/5 to-[#0a0a0f]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-500/5 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-6">
            <span className="w-2 h-2 bg-purple-400 rounded-full" />
            <span className="text-sm text-purple-300">创始团队</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              创始成员
            </span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            汇聚区块链、AI、产品领域的顶尖人才，共同构建 Web4.0 未来
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {teamMembers.map((member, index) => (
            <div
              key={member.name}
              className="group relative bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-purple-500/30 transition-all duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Avatar */}
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl font-bold text-white">
                {member.name.charAt(0)}
              </div>

              {/* Info */}
              <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-1">{member.name}</h3>
                <p className="text-purple-400 text-sm mb-3">{member.role}</p>
                <p className="text-gray-400 text-sm leading-relaxed mb-4">
                  {member.bio}
                </p>

                {/* Social Links */}
                <div className="flex justify-center gap-3">
                  {member.social?.twitter && (
                    <a
                      href={member.social.twitter}
                      className="p-2 text-gray-500 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-all"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Twitter className="w-4 h-4" />
                    </a>
                  )}
                  {member.social?.github && (
                    <a
                      href={member.social.github}
                      className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Github className="w-4 h-4" />
                    </a>
                  )}
                  {member.social?.linkedin && (
                    <a
                      href={member.social.linkedin}
                      className="p-2 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Linkedin className="w-4 h-4" />
                    </a>
                  )}
                  {member.social?.email && (
                    <a
                      href={member.social.email}
                      className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Mail className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              {/* Hover Glow */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>

        {/* Join Us CTA */}
        <div className="mt-16 text-center">
          <p className="text-gray-400 mb-4">加入我们，一起构建 Web4.0 未来</p>
          <a
            href="mailto:career@net4.xyz"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all"
          >
            <Mail className="w-4 h-4" />
            加入团队
          </a>
        </div>
      </div>
    </section>
  );
}