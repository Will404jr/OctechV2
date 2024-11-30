import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Hospital } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-blue-900 mb-4">
            Queue Management System
          </h1>
          <p className="text-lg text-blue-600">
            Choose your organization type to continue
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Link href="/bank/dashboard" className="transform transition-all hover:scale-105">
            <Card className="border-2 border-blue-100 hover:border-blue-500 cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-6 w-6 text-blue-600" />
                  Banking Institution
                </CardTitle>
                <CardDescription>
                  Queue management for banking services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Manage teller services, customer flow, and banking operations efficiently
                </p>
                <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700">
                  Enter Banking Portal
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/hospital/dashboard" className="transform transition-all hover:scale-105">
            <Card className="border-2 border-blue-100 hover:border-blue-500 cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hospital className="h-6 w-6 text-blue-600" />
                  Healthcare Institution
                </CardTitle>
                <CardDescription>
                  Queue management for healthcare services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Streamline patient flow, appointments, and medical services
                </p>
                <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700">
                  Enter Healthcare Portal
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}