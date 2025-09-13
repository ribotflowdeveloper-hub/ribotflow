// ✅ LA LÍNIA CLAU: Declarem aquest fitxer com un Component de Client.
"use client";

import { useState, useEffect } from "react"; // Hem eliminat 'ChangeEvent' que no s'utilitzava
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input, type InputProps } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, User, Building, Phone, Briefcase, MapPin } from "lucide-react";
import type { DetailedAddress } from "@/types/DetailedAddress";

const AddressAutocomplete = dynamic(
  () => import("@/app/(app)/_components/network/AddressAutocomplete"),
  {
    ssr: false,
    loading: () => <div className="h-[58px] bg-gray-800 rounded-md animate-pulse"></div>,
  }
);

export default function OnboardingPage() {
  const supabase = createClient();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [summary, setSummary] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [servicesInput, setServicesInput] = useState("");

  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setFullName(user.user_metadata?.full_name || "");
    };
    fetchUserData();
  }, [supabase]);

  const handleAddressSelect = (address: DetailedAddress) => {
    setStreet(address.street);
    setCity(address.city);
    setPostalCode(address.postcode);
    setRegion(address.region);
    setCountry(address.country);
    setLatitude(address.latitude);
    setLongitude(address.longitude);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No s'ha trobat l'usuari");

      const fullAddressForGeocoding = `${street}, ${postalCode} ${city}, ${country}`;
      const servicesArray = servicesInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const profileData = {
        full_name: fullName,
        company_name: companyName,
        summary,
        company_phone: companyPhone,
        services: servicesArray,
        company_address: fullAddressForGeocoding,
        street,
        city,
        postal_code: postalCode,
        region,
        country,
        latitude,
        longitude,
        onboarding_completed: true,
      };

      const { error } = await supabase.functions.invoke("submit-onboarding", {
        body: { profileData, userId: user.id },
      });
      if (error) throw error;

      toast({ title: "Perfil completat!", description: "Benvingut! Redirigint..." });
      router.push("/redirecting");
    } catch (error: unknown) {
      let errorMessage = "Hi ha hagut un error inesperat.";
      if (error instanceof Error) errorMessage = error.message;
      toast({
        variant: "destructive",
        title: "Error en desar el perfil",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-3xl glass-card p-8 shadow-2xl space-y-8"
      >
        <div className="text-center">
          <h1 className="text-3xl font-bold">Un últim pas</h1>
          <p className="text-muted-foreground">
            Completa el teu perfil professional per començar.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
          <div className="space-y-6">
            <InputWithIcon
              icon={User}
              placeholder="El teu nom complet"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <InputWithIcon
              icon={Building}
              placeholder="Nom de l'empresa o marca"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Petita descripció del teu negoci..."
            />
          </div>

          <div className="space-y-4">
            <AddressAutocomplete
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              onAddressSelect={handleAddressSelect}
            />
            <InputWithIcon
              icon={MapPin}
              placeholder="Població"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
            <InputWithIcon
              icon={MapPin}
              placeholder="Codi Postal"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <InputWithIcon
                icon={MapPin}
                placeholder="Província"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                required
              />
              <InputWithIcon
                icon={MapPin}
                placeholder="País"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InputWithIcon
            icon={Phone}
            type="tel"
            placeholder="Telèfon de contacte"
            value={companyPhone}
            onChange={(e) => setCompanyPhone(e.target.value)}
          />
          <div>
            <InputWithIcon
              icon={Briefcase}
              placeholder="Serveis (separats per comes)"
              value={servicesInput}
              onChange={(e) => setServicesInput(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Ex: Disseny web, SEO, Marketing digital
            </p>
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full text-base py-6">
          {loading ? <Loader2 className="animate-spin" /> : "Guardar i finalitzar"}
        </Button>
      </form>
    </div>
  );
}

interface InputWithIconProps extends InputProps {
  icon: React.ElementType;
}

const InputWithIcon = ({ icon: Icon, ...props }: InputWithIconProps) => (
  <div className="relative">
    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
    <Input className="pl-10" {...props} />
  </div>
);

