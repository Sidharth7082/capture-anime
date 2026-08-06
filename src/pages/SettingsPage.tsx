
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { toast } from "sonner";
import { Settings as SettingsIcon, X } from "lucide-react";
import NavBar from "@/components/NavBar";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import type { JikanAnime } from "@/types/jikan";

const settingsFormSchema = z.object({
  autoNext: z.boolean().default(true),
  autoPlay: z.boolean().default(true),
  autoSkipIntro: z.boolean().default(false),
  enableDub: z.boolean().default(false),
  playOriginalAudio: z.boolean().default(false),
  animeNameLanguage: z.enum(["english", "japanese"]).default("english"),
  showCommentsAtHome: z.boolean().default(true),
  publicWatchList: z.boolean().default(false),
  notificationIgnoreFolders: z.object({
    watching: z.boolean().default(false),
    onHold: z.boolean().default(false),
    planToWatch: z.boolean().default(false),
    dropped: z.boolean().default(true),
    completed: z.boolean().default(true),
  }),
  notificationIgnoreLanguage: z.enum(["none", "sub", "dub"]).default("none"),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

const defaultSettings: SettingsFormValues = {
  autoNext: true,
  autoPlay: true,
  autoSkipIntro: false,
  enableDub: false,
  playOriginalAudio: false,
  animeNameLanguage: "english",
  showCommentsAtHome: true,
  publicWatchList: false,
  notificationIgnoreFolders: {
    watching: false,
    onHold: false,
    planToWatch: false,
    dropped: true,
    completed: true,
  },
  notificationIgnoreLanguage: "none",
};

const SettingsPage = () => {
  const navigate = useNavigate();
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: defaultSettings,
  });

  useEffect(() => {
    try {
      const userSettings = localStorage.getItem("userSettings");
      if (userSettings) {
        const parsed = JSON.parse(userSettings);
        // Merge with defaults so keys missing from older saved settings
        // (schema drift) keep their default values instead of becoming
        // undefined and failing zod validation on submit.
        form.reset({
          ...defaultSettings,
          ...parsed,
          notificationIgnoreFolders: {
            ...defaultSettings.notificationIgnoreFolders,
            ...(parsed.notificationIgnoreFolders || {}),
          },
        });
      }
    } catch (error) {
      console.error("Failed to parse user settings from localStorage", error);
    }
  }, [form]);

  function onSubmit(data: SettingsFormValues) {
    localStorage.setItem("userSettings", JSON.stringify(data));
    toast.success("Settings saved successfully!");
  }

  const handleSearch = (anime: JikanAnime | null) => {
    if (anime) {
      navigate("/");
    }
  };

  const ignoreFolders = [
    { id: "watching", label: "Watching" },
    { id: "onHold", label: "On-Hold" },
    { id: "planToWatch", label: "Plan to Watch" },
    { id: "dropped", label: "Dropped" },
    { id: "completed", label: "Completed" },
  ] as const;

  return (
    <div className="min-h-screen bg-[#181520] text-gray-300">
      <NavBar onSearch={handleSearch} />
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4 text-white">
            <SettingsIcon className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Settings</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-gray-700/50"
          >
            <X className="w-8 h-8" />
          </Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-6">
              <SettingItem>
                <SettingLabel>Auto Next</SettingLabel>
                <FormField
                  control={form.control}
                  name="autoNext"
                  render={({ field }) => (
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  )}
                />
              </SettingItem>

              <SettingItem>
                <SettingLabel>Auto Play</SettingLabel>
                <FormField
                  control={form.control}
                  name="autoPlay"
                  render={({ field }) => (
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  )}
                />
              </SettingItem>

              <SettingItem>
                <SettingLabel>Auto Skip Intro</SettingLabel>
                <FormField
                  control={form.control}
                  name="autoSkipIntro"
                  render={({ field }) => (
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  )}
                />
              </SettingItem>

              <SettingItem>
                <SettingLabel>Enable DUB</SettingLabel>
                <FormField
                  control={form.control}
                  name="enableDub"
                  render={({ field }) => (
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  )}
                />
              </SettingItem>

              <SettingItem>
                <div>
                  <SettingLabel>Play Original Audio</SettingLabel>
                  <p className="text-sm text-gray-400">
                    If enabled, the player will play original audio by default.
                  </p>
                </div>
                <FormField
                  control={form.control}
                  name="playOriginalAudio"
                  render={({ field }) => (
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  )}
                />
              </SettingItem>

              <SettingItem>
                <SettingLabel>Language for anime name</SettingLabel>
                <FormField
                  control={form.control}
                  name="animeNameLanguage"
                  render={({ field }) => (
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex items-center gap-4"
                      >
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="english" id="lang-en" />
                          </FormControl>
                          <Label htmlFor="lang-en" className="font-normal">English</Label>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="japanese" id="lang-jp" />
                          </FormControl>
                          <Label htmlFor="lang-jp" className="font-normal">Japanese</Label>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                  )}
                />
              </SettingItem>

              <SettingItem>
                <SettingLabel>Show comments at home</SettingLabel>
                <FormField
                  control={form.control}
                  name="showCommentsAtHome"
                  render={({ field }) => (
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  )}
                />
              </SettingItem>

              <SettingItem>
                <SettingLabel>Public Watch List</SettingLabel>
                <FormField
                  control={form.control}
                  name="publicWatchList"
                  render={({ field }) => (
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  )}
                />
              </SettingItem>

              <div className="space-y-2 pt-4 border-t border-gray-800">
                <SettingLabel>Notification ignore folders</SettingLabel>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pt-2">
                  {ignoreFolders.map((item) => (
                    <FormField
                      key={item.id}
                      control={form.control}
                      name={`notificationIgnoreFolders.${item.id}`}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal text-gray-300">
                            {item.label}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>

              <SettingItem>
                <SettingLabel>Notification ignore language</SettingLabel>
                <FormField
                  control={form.control}
                  name="notificationIgnoreLanguage"
                  render={({ field }) => (
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex items-center gap-4"
                      >
                         <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="none" id="lang-none" />
                          </FormControl>
                          <Label htmlFor="lang-none" className="font-normal">None</Label>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="sub" id="lang-sub" />
                          </FormControl>
                          <Label htmlFor="lang-sub" className="font-normal">SUB</Label>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="dub" id="lang-dub" />
                          </FormControl>
                          <Label htmlFor="lang-dub" className="font-normal">DUB</Label>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                  )}
                />
              </SettingItem>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                size="lg"
                className="w-full bg-[#f472b6] hover:bg-[#ec4899] text-white text-lg"
              >
                Save Settings
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

const SettingItem = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center justify-between border-b border-gray-800 py-4">
    {children}
  </div>
);

const SettingLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-base font-medium text-white">{children}</p>
);

export default SettingsPage;
