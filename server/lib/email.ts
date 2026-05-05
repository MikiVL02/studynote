import nodemailer from 'nodemailer'

function createTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.126.com',
    port: 465,
    secure: true,
    auth: {
      user: 'mikivl@126.com',
      pass: process.env.EMAIL_PASS!,
    },
  })
}

export async function sendVerifyCode(to: string, code: string) {
  await createTransporter().sendMail({
    from: '"MikiVL 笔记" <mikivl@126.com>',
    to,
    subject: '邮箱验证码',
    text: `你的验证码是：${code}，10 分钟内有效。`,
    html: `<p style="font-family:sans-serif">你的验证码是：<strong style="font-size:1.2em;letter-spacing:0.1em">${code}</strong>，10 分钟内有效。</p>`,
  })
}

export async function sendResetCode(to: string, code: string) {
  await createTransporter().sendMail({
    from: '"MikiVL 笔记" <mikivl@126.com>',
    to,
    subject: '重置密码验证码',
    text: `你的重置密码验证码是：${code}，10 分钟内有效。如非本人操作请忽略。`,
    html: `<p style="font-family:sans-serif">你的重置密码验证码是：<strong style="font-size:1.2em;letter-spacing:0.1em">${code}</strong>，10 分钟内有效。如非本人操作请忽略。</p>`,
  })
}
