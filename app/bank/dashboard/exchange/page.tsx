"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash } from "lucide-react"; // Imported icons
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
// import {
//   Select,
//   SelectTrigger,
//   SelectValue,
//   SelectContent,
//   SelectItem,
// } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { countries, Country } from "./countries";
import { QueueSpinner } from "@/components/queue-spinner";

interface ExchangeRate {
  _id: string;
  countryName: string;
  countryCode: string;
  currencyCode: string;
  buyingRate: number;
  sellingRate: number;
  lastUpdated: string;
}

export default function ExchangePage() {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingRate, setEditingRate] = useState<ExchangeRate | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const fetchRates = async () => {
    setIsLoading(true); // Start loading
    try {
      const response = await fetch("/api/bank/exchange-rates");
      const data = await response.json();
      setRates(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch exchange rates",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false); // Stop loading
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const country = countries.find((c) => c.name === e.target.value);
    setSelectedCountry(country || null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const rateData = {
      countryName: formData.get("countryName"),
      countryCode: formData.get("countryCode"),
      currencyCode: formData.get("currencyCode"),
      buyingRate: Number(formData.get("buyRate")),
      sellingRate: Number(formData.get("sellRate")),
    };

    try {
      let response;
      if (editingRate) {
        response = await fetch(`/api/bank/exchange-rates/${editingRate._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rateData),
        });
      } else {
        response = await fetch("/api/bank/exchange-rates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rateData),
        });
      }

      if (response.ok) {
        toast({
          title: "Success",
          description: `Exchange rate ${
            editingRate ? "updated" : "created"
          } successfully`,
        });
        setIsOpen(false);
        setEditingRate(null);
        setSelectedCountry(null);
        fetchRates();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${
          editingRate ? "update" : "create"
        } exchange rate`,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/bank/exchange-rates/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Exchange rate deleted successfully",
        });
        fetchRates();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete exchange rate",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Exchange Rates</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#0e4480]">
              <Plus className="mr-2 h-4 w-4" />
              Add Rate
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingRate ? "Edit Exchange Rate" : "Add New Exchange Rate"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="countryName">Country Name</Label>
                <select
                  id="countryName"
                  name="countryName"
                  className="w-full h-10 border-collapse border-blue-300 focus:border-blue-300 focus:ring focus:ring-blue-500 rounded-md p-2"
                  defaultValue={editingRate?.countryName}
                  onChange={handleCountryChange}
                  required
                >
                  <option value="">Select a country</option>
                  {countries.map((country) => (
                    <option key={country.code} value={country.name}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="countryCode">Country Code</Label>
                  <Input
                    id="countryCode"
                    name="countryCode"
                    value={selectedCountry?.code || ""}
                    readOnly
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currencyCode">Currency Code</Label>
                  <Input
                    id="currencyCode"
                    name="currencyCode"
                    value={selectedCountry?.currency || ""}
                    readOnly
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="buyRate">Buy Rate</Label>
                  <Input
                    id="buyRate"
                    name="buyRate"
                    type="number"
                    step="0.0001"
                    defaultValue={editingRate?.buyingRate || ""}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sellRate">Sell Rate</Label>
                  <Input
                    id="sellRate"
                    name="sellRate"
                    type="number"
                    step="0.0001"
                    defaultValue={editingRate?.sellingRate || ""}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full bg-[#0e4480]">
                {editingRate ? "Update" : "Create"} Rate
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <QueueSpinner size="lg" color="bg-[#0e4480]" dotCount={12} />
        </div>
      ) : rates.length === 0 ? (
        <p className="text-center text-gray-500">
          No exchange rates available.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Country</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Buy Rate</TableHead>
              <TableHead>Sell Rate</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rates.map((rate) => (
              <TableRow key={rate._id}>
                <TableCell>{rate.countryName}</TableCell>
                <TableCell>{rate.currencyCode}</TableCell>
                <TableCell>{rate.buyingRate}</TableCell>
                <TableCell>{rate.sellingRate}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    className="mr-2 bg-[#3a72ec]"
                    onClick={() => {
                      setEditingRate(rate);
                      setSelectedCountry(
                        countries.find((c) => c.name === rate.countryName) ||
                          null
                      );
                      setIsOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(rate._id)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
