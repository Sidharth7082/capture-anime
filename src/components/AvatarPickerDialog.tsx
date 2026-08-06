
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

const avatarData = [
  { name: "Carter", url: "/lovable-uploads/91c3eef4-0329-4be7-9b41-22b108a9830b.png" },
  { name: "Mink", url: "/lovable-uploads/fe32b5d9-ba40-46e0-adef-eb732ded26a8.png" },
  { name: "Hero", url: "/lovable-uploads/50d688e8-acdb-424c-a21d-21146927a9d9.png" },
  { name: "Sora", url: "/lovable-uploads/26ec4803-dba1-4f02-811d-b082746d02d7.png" },
];

const avatarNames = avatarData.map(a => a.name);
const avatars = avatarData.map(a => a.url);

interface AvatarPickerDialogProps {
  children: React.ReactNode;
  onAvatarSelect: (url: string) => void;
}

export function AvatarPickerDialog({ children, onAvatarSelect }: AvatarPickerDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-[#211F2D] border-none text-white">
        <DialogHeader>
          <DialogTitle>Choose your Avatar</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          {avatars.map((url, index) => (
            <DialogClose asChild key={url}>
              <button onClick={() => onAvatarSelect(url)} className="flex flex-col items-center gap-2 group">
                <Avatar className="h-24 w-24 cursor-pointer ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:ring-2 hover:ring-purple-500 transition-all">
                  <AvatarImage src={url} alt={`Avatar ${avatarNames[index]}`} />
                  <AvatarFallback>{avatarNames[index].substring(0,2)}</AvatarFallback>
                </Avatar>
                <span className="text-sm text-gray-300 group-hover:text-white">{avatarNames[index]}</span>
              </button>
            </DialogClose>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
