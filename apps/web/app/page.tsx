import Image from "next/image";
import {APP_NAME, formatUser, isOwner, type User} from "@closry/shared"

export default function Home() {

  const fakeUser: User = {
	id: '00000000-0000-0000-0000-000000000001',
	email: 'cfo@email.com',
	role: 'owner',
  };

  return (
    <>
      	{APP_NAME}
		<br/>
		{isOwner(fakeUser) ? "Onwer" : "Not owner"}
		<br/>
		{formatUser(fakeUser)}
    </>
  );
}
