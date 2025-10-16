# Temple Notifier

To host your own version do the following:

1. Fork this repository
2. Go to [Vercel](https://vercel.com) and deploy your fork
3. Put the vercel url in the const variable of `public/script.user.js:28`
4. Go to [Supabase](https://supabase.com) and create a new postgres project
5. In Supabase go to your project and on the top you will see connect, click this button
6. Go to ORMs and copy this env file to a .env file you create in the root of the repository locally
7. Fill in the password to the database in the .env file
8. Run `bun i` or any other package manager install
9. Run `bunx prisma db push` this will push the database to supabase
10. Copy the full contents of the .env file
11. In vercel go to your project > Settings > Environment Variables and paste the contents of the .env file into the "create new" Client_Key... field
12. Override the build command in vercel, go to your project > Settings > Build and Deployment and paste `npx prisma generate && nuxt build` into the `Build Command` field. (you may need to toggle the override button)
13. Redeploy vercel


Please dont put the .env with passwords in the repo
