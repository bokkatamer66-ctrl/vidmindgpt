export default async function handler(req, res) {
  console.log("SnapGPT API reached");

  return res.status(200).json({
    ok: true,
    message: "SnapGPT API is working!",
    method: req.method
  });
}
