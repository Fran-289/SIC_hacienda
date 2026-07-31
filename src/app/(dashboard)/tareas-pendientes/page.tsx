import ClientTareasPendientes from './ClientTareasPendientes';

export default function TareasPendientesPage() {
  const currentYear = new Date().getFullYear();
  const minYear = 2020;
  return <ClientTareasPendientes currentYear={currentYear} minYear={minYear} />;
}
