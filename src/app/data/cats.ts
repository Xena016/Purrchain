export type CatStatus = "available" | "cloudAdopted" | "pendingAdoption" | "adopted";

export interface Cat {
  id: number;
  name: string;
  age: number;
  gender: "male" | "female";
  desc: string;
  fullDesc: string;
  status: CatStatus;
  shelter: string;
  shelterLocation: string;
  image: string;
  stage: 1 | 2 | 3;
  personality: string[];
  weight: string;
  vaccinated: boolean;
  neutered: boolean;
}

export const CATS: Cat[] = [
  {
    id: 0,
    name: "雀猫",
    age: 1,
    gender: "female",
    desc: "活泼好动的小雀猫，等待有缘人的守护",
    fullDesc: "雀猫是一只充满活力的小猫咪，因为在城市公园被发现而得名。她非常喜欢和人互动，喜欢追逐玩具和爬猫爬架。尽管曾经流浪，她依然对人充满信任，很快就会成为家庭的小太阳。",
    status: "available",
    shelter: "爱心猫舍",
    shelterLocation: "台湾彰化",
    image: "https://images.unsplash.com/photo-1702914954859-f037fc75b760?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
    stage: 1,
    personality: ["活泼", "亲人", "好奇"],
    weight: "2.8kg",
    vaccinated: true,
    neutered: false,
  },
  {
    id: 1,
    name: "墨墨",
    age: 3,
    gender: "male",
    desc: "沉稳内敛的黑猫，喜欢安静地陪伴主人",
    fullDesc: "墨墨是一只优雅的黑猫，有着一双迷人的绿色眼睛。他性格沉稳，不喜吵闹，但非常忠诚。每当主人工作时，他会静静地躺在旁边，是完美的工作伙伴。",
    status: "cloudAdopted",
    shelter: "爱心猫舍",
    shelterLocation: "台湾彰化",
    image: "https://images.unsplash.com/photo-1566155980921-314330ac107b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
    stage: 2,
    personality: ["沉稳", "忠诚", "独立"],
    weight: "4.5kg",
    vaccinated: true,
    neutered: true,
  },
  {
    id: 2,
    name: "雪球",
    age: 0.5,
    gender: "female",
    desc: "蓬松可爱的小白猫，爱撒娇爱玩耍",
    fullDesc: "雪球是一只纯白色的小猫咪，毛茸茸的像一个小雪球。她非常爱撒娇，总是喜欢爬到人的怀里打呼噜。因年纪小，精力充沛，需要有耐心的主人。",
    status: "available",
    shelter: "毛茸茸之家",
    shelterLocation: "台湾台北",
    image: "https://images.unsplash.com/photo-1761360386530-6978e83dec44?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
    stage: 1,
    personality: ["撒娇", "活泼", "贪玩"],
    weight: "1.2kg",
    vaccinated: false,
    neutered: false,
  },
  {
    id: 3,
    name: "灰灰",
    age: 2,
    gender: "male",
    desc: "温和亲人的虎斑猫，适合家庭饲养",
    fullDesc: "灰灰是一只温柔的虎斑猫，对小孩和其他宠物都很友善。他已经找到了爱他的家庭，现在正在他温暖的新家快乐地生活。",
    status: "adopted",
    shelter: "毛茸茸之家",
    shelterLocation: "台湾台北",
    image: "https://images.unsplash.com/photo-1682333116589-fc76ded25962?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
    stage: 3,
    personality: ["温和", "友善", "亲人"],
    weight: "3.8kg",
    vaccinated: true,
    neutered: true,
  },
  {
    id: 4,
    name: "花花",
    age: 4,
    gender: "female",
    desc: "三花猫，经历丰富，希望找到温暖的家",
    fullDesc: "花花是一只有着丰富经历的三花猫。她曾在街头流浪多年，但依然保留着对人类的善意。她更适合安静的环境和有经验的猫咪主人。",
    status: "available",
    shelter: "彩虹猫舍",
    shelterLocation: "台湾高雄",
    image: "https://images.unsplash.com/photo-1761772969790-1b4528b0d38e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
    stage: 3,
    personality: ["谨慎", "独立", "温柔"],
    weight: "3.2kg",
    vaccinated: true,
    neutered: true,
  },
  {
    id: 5,
    name: "蓝眸",
    age: 1.5,
    gender: "male",
    desc: "暹罗猫，高贵优雅，蓝色眼睛令人着迷",
    fullDesc: "蓝眸是一只纯种暹罗猫，拥有迷人的蓝色眼睛和优雅的体态。他话比较多，喜欢和主人聊天，非常黏人。已有爱心人士为他云领养，他正在快乐成长。",
    status: "cloudAdopted",
    shelter: "彩虹猫舍",
    shelterLocation: "台湾高雄",
    image: "https://images.unsplash.com/photo-1743560769534-1f8abb6acb9a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
    stage: 2,
    personality: ["话多", "黏人", "聪明"],
    weight: "3.0kg",
    vaccinated: true,
    neutered: false,
  },
  {
    id: 6,
    name: "橘子",
    age: 0.8,
    gender: "male",
    desc: "活泼的橘猫小勇士，喜欢探索一切",
    fullDesc: "橘子是一只充满探索欲的小橘猫。他无所畏惧，什么都要去试试，有时候会因为太好奇而惹点小麻烦。需要有活力的主人陪他一起玩耍。",
    status: "available",
    shelter: "爱心猫舍",
    shelterLocation: "台湾彰化",
    image: "https://images.unsplash.com/photo-1621854065840-8a83d8a97009?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
    stage: 1,
    personality: ["勇敢", "好奇", "活泼"],
    weight: "2.1kg",
    vaccinated: false,
    neutered: false,
  },
  {
    id: 7,
    name: "礼服",
    age: 2.5,
    gender: "female",
    desc: "优雅的礼服猫，黑白分明，气质出众",
    fullDesc: "礼服是一只优雅的黑白猫，因其像穿着礼服一样的毛色而得名。她有着强烈的个性，需要一点时间建立信任，但一旦信任建立，她会成为你最忠诚的伙伴。目前有申请者正在进行领养手续。",
    status: "pendingAdoption",
    shelter: "毛茸茸之家",
    shelterLocation: "台湾台北",
    image: "https://images.unsplash.com/photo-1718996406895-b30d67c21649?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
    stage: 2,
    personality: ["优雅", "独立", "忠诚"],
    weight: "3.5kg",
    vaccinated: true,
    neutered: true,
  },
];

export const SHELTERS = [
  { id: 0, name: "爱心猫舍", location: "台湾彰化", catCount: 3, status: "approved" },
  { id: 1, name: "毛茸茸之家", location: "台湾台北", catCount: 3, status: "approved" },
  { id: 2, name: "彩虹猫舍", location: "台湾高雄", catCount: 2, status: "approved" },
];

export function getStatusLabel(status: CatStatus) {
  switch (status) {
    case "available": return "待领养";
    case "cloudAdopted": return "云领养中";
    case "pendingAdoption": return "领养处理中";
    case "adopted": return "已被领养";
  }
}

export function getStatusColor(status: CatStatus) {
  switch (status) {
    case "available": return "text-emerald-400 bg-emerald-400/10 border-emerald-400/30";
    case "cloudAdopted": return "text-cyan-400 bg-cyan-400/10 border-cyan-400/30";
    case "pendingAdoption": return "text-amber-400 bg-amber-400/10 border-amber-400/30";
    case "adopted": return "text-purple-400 bg-purple-400/10 border-purple-400/30";
  }
}
